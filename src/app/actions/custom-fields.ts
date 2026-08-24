"use server";

import { db } from "@/db";
import { customFieldDefinitions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCustomFieldDefinitions(entityType?: "contact" | "company" | "deal") {
  const session = await auth();
  if (!session?.user) return [];

  const conditions = [eq(customFieldDefinitions.orgId, session.user.orgId)];
  if (entityType) {
    conditions.push(eq(customFieldDefinitions.entityType, entityType));
  }

  return db.query.customFieldDefinitions.findMany({
    where: and(...conditions),
    orderBy: [asc(customFieldDefinitions.order)],
  });
}

export async function createCustomFieldDefinition(data: {
  entityType: "contact" | "company" | "deal";
  label: string;
  key?: string;
  fieldType: "text" | "number" | "date" | "select" | "boolean";
  options?: string[];
  isRequired?: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;
  const key = (data.key || data.label.toLowerCase().replace(/[^a-z0-9]/g, "_")).slice(0, 32);

  const [field] = await db
    .insert(customFieldDefinitions)
    .values({
      orgId,
      entityType: data.entityType,
      label: data.label.trim(),
      key,
      fieldType: data.fieldType,
      options: data.options || [],
      isRequired: !!data.isRequired,
    })
    .returning();

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/companies");
  return field;
}

export async function deleteCustomFieldDefinition(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db
    .delete(customFieldDefinitions)
    .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.orgId, session.user.orgId)));

  revalidatePath("/dashboard/settings");
  return { success: true };
}
