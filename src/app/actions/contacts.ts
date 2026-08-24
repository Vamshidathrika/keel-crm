"use server";

import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ownerScope } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { triggerWorkflows } from "@/app/actions/automations";
import { runProspectorAgent } from "@/lib/agents/prospector";

export async function getContacts() {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(contacts.orgId, orgId)];
  if (ownerIdFilter) {
    conditions.push(eq(contacts.ownerId, ownerIdFilter));
  }

  return db.query.contacts.findMany({
    where: and(...conditions),
    with: {
      company: true,
    },
    orderBy: [desc(contacts.createdAt)],
  });
}

export async function getContactById(id: string) {
  const session = await auth();
  if (!session?.user) return null;

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(contacts.orgId, orgId), eq(contacts.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(contacts.ownerId, ownerIdFilter));
  }

  return db.query.contacts.findFirst({
    where: and(...conditions),
    with: {
      company: true,
    },
  });
}

export async function createContact(data: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  city?: string;
  companyId?: string;
  tags?: string[];
  customFields?: Record<string, string>;
  ownerId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  // Reps default to owning their created contacts
  const ownerId = session.user.role === "rep" ? userId : (data.ownerId || userId);

  const [contact] = await db
    .insert(contacts)
    .values({
      orgId,
      companyId: data.companyId || null,
      firstName: data.firstName.trim(),
      lastName: data.lastName?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      title: data.title?.trim() || null,
      city: data.city?.trim() || null,
      source: "manual",
      ownerId,
      tags: data.tags || [],
      customFields: data.customFields || {},
      score: 30, // Heuristic default starting score
    })
    .returning();

  // Create timeline activity log
  await db.insert(activities).values({
    orgId,
    type: "note",
    relatedContactId: contact.id,
    actorUserId: userId,
    body: "Contact created manually.",
    source: "manual",
  });

  // Log audit trail
  await logAuditEntry(orgId, userId, "create", "contact", contact.id, {
    contactId: contact.id,
    name: `${contact.firstName} ${contact.lastName || ""}`,
  });

  await triggerWorkflows(orgId, "contact_created", contact.id, {
    contactId: contact.id,
    companyId: contact.companyId,
    ownerId: contact.ownerId,
  });

  // Autonomous Prospector Agent Trigger
  runProspectorAgent(orgId, "contact", contact.id, "event").catch((err) =>
    console.error("Prospector trigger error:", err)
  );

  revalidatePath("/dashboard/contacts");
  return contact;
}

export async function updateContact(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    title?: string;
    city?: string;
    companyId?: string;
    tags?: string[];
    customFields?: Record<string, string>;
    ownerId?: string;
    score?: number;
    scoreBreakdown?: any;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(contacts.orgId, orgId), eq(contacts.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(contacts.ownerId, ownerIdFilter));
  }

  // Verify ownership before updating
  const contact = await db.query.contacts.findFirst({
    where: and(...conditions),
  });

  if (!contact) throw new Error("Contact not found or access denied.");

  const [updated] = await db
    .update(contacts)
    .set({
      companyId: data.companyId !== undefined ? (data.companyId || null) : contact.companyId,
      firstName: data.firstName !== undefined ? data.firstName.trim() : contact.firstName,
      lastName: data.lastName !== undefined ? (data.lastName.trim() || null) : contact.lastName,
      email: data.email !== undefined ? (data.email.trim() || null) : contact.email,
      phone: data.phone !== undefined ? (data.phone.trim() || null) : contact.phone,
      title: data.title !== undefined ? (data.title.trim() || null) : contact.title,
      city: data.city !== undefined ? (data.city.trim() || null) : contact.city,
      ownerId: data.ownerId !== undefined && role !== "rep" ? data.ownerId : contact.ownerId,
      tags: data.tags !== undefined ? data.tags : contact.tags,
      customFields: data.customFields !== undefined ? data.customFields : contact.customFields,
      score: data.score !== undefined ? data.score : contact.score,
      scoreBreakdown: data.scoreBreakdown !== undefined ? data.scoreBreakdown : contact.scoreBreakdown,
    })
    .where(eq(contacts.id, id))
    .returning();

  await logAuditEntry(orgId, userId, "update", "contact", id, data as Record<string, unknown>);

  revalidatePath("/dashboard/contacts");
  return updated;
}

export async function deleteContact(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(contacts.orgId, orgId), eq(contacts.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(contacts.ownerId, ownerIdFilter));
  }

  const contact = await db.query.contacts.findFirst({
    where: and(...conditions),
  });

  if (!contact) throw new Error("Contact not found or access denied.");

  await db.delete(contacts).where(eq(contacts.id, id));

  await logAuditEntry(orgId, userId, "delete", "contact", id, {
    contactId: id,
    name: `${contact.firstName} ${contact.lastName || ""}`,
  });

  revalidatePath("/dashboard/contacts");
  return { success: true };
}
