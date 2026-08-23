"use server";

import { db } from "@/db";
import { contacts, activities, deals, tasks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assert, canManageOrgSettings } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function findDuplicateContacts() {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId } = session.user;

  // Fetch all contacts in org
  const list = await db.query.contacts.findMany({
    where: eq(contacts.orgId, orgId),
  });

  const duplicateGroups: Array<{
    field: string;
    value: string;
    contacts: typeof list;
  }> = [];

  const processedPhones = new Set<string>();
  const processedEmails = new Set<string>();

  for (const c of list) {
    // 1. Phone duplicates check
    if (c.phone && !processedPhones.has(c.phone)) {
      const dupes = list.filter((x) => x.phone === c.phone);
      if (dupes.length > 1) {
        duplicateGroups.push({
          field: "phone",
          value: c.phone,
          contacts: dupes,
        });
        processedPhones.add(c.phone);
      }
    }

    // 2. Email duplicates check
    if (c.email && !processedEmails.has(c.email)) {
      const dupes = list.filter((x) => x.email?.toLowerCase() === c.email?.toLowerCase());
      if (dupes.length > 1) {
        duplicateGroups.push({
          field: "email",
          value: c.email,
          contacts: dupes,
        });
        processedEmails.add(c.email);
      }
    }
  }

  return duplicateGroups;
}

export async function mergeContacts(targetId: string, sourceId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const target = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, targetId), eq(contacts.orgId, orgId)),
  });

  const source = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, sourceId), eq(contacts.orgId, orgId)),
  });

  if (!target || !source) {
    throw new Error("Target or source contact not found.");
  }

  await db.transaction(async (tx) => {
    // 1. Merge Activities
    await tx
      .update(activities)
      .set({ relatedContactId: targetId })
      .where(and(eq(activities.relatedContactId, sourceId), eq(activities.orgId, orgId)));

    // 2. Merge Deals
    await tx
      .update(deals)
      .set({ contactId: targetId })
      .where(and(eq(deals.contactId, sourceId), eq(deals.orgId, orgId)));

    // 3. Merge Tasks
    await tx
      .update(tasks)
      .set({ relatedContactId: targetId })
      .where(and(eq(tasks.relatedContactId, sourceId), eq(tasks.orgId, orgId)));

    // 4. Log Merge Activity on Target contact
    const bodyText = `Merged duplicate contact record "${source.firstName} ${source.lastName || ""}" (ID: ${sourceId}) into this contact record.`;
    await tx.insert(activities).values({
      orgId,
      type: "system",
      relatedContactId: targetId,
      actorUserId: userId,
      body: bodyText,
      source: "system",
    });

    // 5. Delete Source Contact
    await tx.delete(contacts).where(eq(contacts.id, sourceId));
  });

  await logAuditEntry(orgId, userId, "merge", "contact", targetId, {
    targetContactId: targetId,
    sourceContactId: sourceId,
  });

  revalidatePath("/dashboard/contacts");
  return { success: true };
}
