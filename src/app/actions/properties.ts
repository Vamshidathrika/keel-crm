"use server";

import { db } from "@/db";
import { properties, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProperties() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.properties.findMany({
    where: eq(properties.orgId, session.user.orgId),
    orderBy: [desc(properties.createdAt)],
  });
}

export async function createProperty(data: {
  title: string;
  location: string;
  price: string;
  type?: string;
  status?: string;
  buyerOrTenant?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  const [prop] = await db
    .insert(properties)
    .values({
      orgId,
      title: data.title.trim(),
      location: data.location.trim(),
      price: data.price.trim(),
      type: data.type || "Commercial",
      status: data.status || "Available",
      buyerOrTenant: data.buyerOrTenant || null,
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "system",
    body: `Property listing added: "${prop.title}" at ${prop.location} (${prop.price})`,
    source: "manual",
  });

  revalidatePath("/dashboard/properties");
  return prop;
}

export async function updatePropertyStatus(id: string, status: string, buyerOrTenant?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [updated] = await db
    .update(properties)
    .set({
      status,
      ...(buyerOrTenant ? { buyerOrTenant } : {}),
    })
    .where(and(eq(properties.id, id), eq(properties.orgId, session.user.orgId)))
    .returning();

  revalidatePath("/dashboard/properties");
  return updated;
}
