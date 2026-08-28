"use server";

import { db } from "@/db";
import { customObjectDefinitions, customObjectRecords, customFieldDefinitions, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface CustomObjectDefinitionInput {
  singularName: string;
  pluralName: string;
  slug: string;
  description?: string;
  icon?: string;
  primaryFieldKey?: string;
}

export interface CustomObjectRecordInput {
  objectDefId: string;
  title: string;
  attributes: Record<string, any>;
  linkedContactId?: string;
  linkedDealId?: string;
}

/**
 * List all Custom Object Definitions for the current organization
 */
export async function getCustomObjectDefinitions() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.customObjectDefinitions.findMany({
    where: eq(customObjectDefinitions.orgId, session.user.orgId),
    with: {
      fields: true,
    },
    orderBy: [desc(customObjectDefinitions.createdAt)],
  });
}

/**
 * Create a new Custom Entity Type (e.g. "Properties", "Shipments", "Students")
 */
export async function createCustomObjectDefinition(data: CustomObjectDefinitionInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  if (role === "rep") {
    throw new Error("Access Denied: Only Admins/Managers can create custom objects.");
  }

  const slug = (data.slug || data.pluralName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");

  const [objDef] = await db
    .insert(customObjectDefinitions)
    .values({
      orgId,
      singularName: data.singularName.trim(),
      pluralName: data.pluralName.trim(),
      slug,
      description: data.description?.trim() || null,
      icon: data.icon || "Folder",
      primaryFieldKey: data.primaryFieldKey || "title",
    })
    .returning();

  await logAuditEntry(orgId, userId, "create", "custom_object_def", objDef.id, {
    singularName: objDef.singularName,
    pluralName: objDef.pluralName,
    slug: objDef.slug,
  });

  revalidatePath("/dashboard/settings");
  return objDef;
}

/**
 * Get records for a specific custom object definition
 */
export async function getCustomObjectRecords(objectDefIdOrSlug: string) {
  const session = await auth();
  if (!session?.user) return { definition: null, records: [] };

  const { orgId } = session.user;

  // Resolve by ID or Slug
  let objDef = await db.query.customObjectDefinitions.findFirst({
    where: and(eq(customObjectDefinitions.orgId, orgId), eq(customObjectDefinitions.id, objectDefIdOrSlug)),
  });

  if (!objDef) {
    objDef = await db.query.customObjectDefinitions.findFirst({
      where: and(eq(customObjectDefinitions.orgId, orgId), eq(customObjectDefinitions.slug, objectDefIdOrSlug)),
    });
  }

  if (!objDef) return { definition: null, records: [] };

  const records = await db.query.customObjectRecords.findMany({
    where: and(eq(customObjectRecords.orgId, orgId), eq(customObjectRecords.objectDefId, objDef.id)),
    with: {
      linkedContact: true,
      linkedDeal: true,
    },
    orderBy: [desc(customObjectRecords.createdAt)],
  });

  return { definition: objDef, records };
}

/**
 * Create a new record instance of a Custom Object
 */
export async function createCustomObjectRecord(data: CustomObjectRecordInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const [record] = await db
    .insert(customObjectRecords)
    .values({
      orgId,
      objectDefId: data.objectDefId,
      title: data.title.trim(),
      attributes: data.attributes || {},
      linkedContactId: data.linkedContactId || null,
      linkedDealId: data.linkedDealId || null,
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "system",
    relatedContactId: data.linkedContactId || null,
    relatedDealId: data.linkedDealId || null,
    body: `Created custom record "${record.title}"`,
    source: "manual",
  });

  await logAuditEntry(orgId, userId, "create", "custom_object_record", record.id, {
    title: record.title,
    objectDefId: data.objectDefId,
  });

  revalidatePath(`/dashboard/objects`);
  return record;
}

/**
 * Update an existing Custom Object record
 */
export async function updateCustomObjectRecord(
  id: string,
  data: Partial<CustomObjectRecordInput>
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const [updated] = await db
    .update(customObjectRecords)
    .set({
      ...(data.title ? { title: data.title.trim() } : {}),
      ...(data.attributes ? { attributes: data.attributes } : {}),
      ...(data.linkedContactId !== undefined ? { linkedContactId: data.linkedContactId || null } : {}),
      ...(data.linkedDealId !== undefined ? { linkedDealId: data.linkedDealId || null } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(customObjectRecords.id, id), eq(customObjectRecords.orgId, orgId)))
    .returning();

  await logAuditEntry(orgId, userId, "update", "custom_object_record", id, data);

  revalidatePath(`/dashboard/objects`);
  return updated;
}

/**
 * Delete a Custom Object record
 */
export async function deleteCustomObjectRecord(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  await db
    .delete(customObjectRecords)
    .where(and(eq(customObjectRecords.id, id), eq(customObjectRecords.orgId, orgId)));

  await logAuditEntry(orgId, userId, "delete", "custom_object_record", id, { id });

  revalidatePath(`/dashboard/objects`);
  return { success: true };
}
