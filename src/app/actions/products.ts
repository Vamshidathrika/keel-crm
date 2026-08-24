"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { auth } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProducts(category?: string) {
  const session = await auth();
  if (!session?.user) return [];

  const conditions = [eq(products.orgId, session.user.orgId)];
  if (category && category !== "all") {
    conditions.push(eq(products.category, category));
  }

  return db.query.products.findMany({
    where: and(...conditions),
    orderBy: [desc(products.createdAt)],
  });
}

export async function createProduct(data: {
  name: string;
  sku?: string;
  description?: string;
  unitPrice: number;
  currency?: string;
  taxRatePercent?: number;
  category?: string;
  isActive?: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const [product] = await db
    .insert(products)
    .values({
      orgId,
      name: data.name.trim(),
      sku: data.sku?.trim() || null,
      description: data.description?.trim() || null,
      unitPrice: data.unitPrice || 0,
      currency: data.currency || "INR",
      taxRatePercent: data.taxRatePercent !== undefined ? data.taxRatePercent : 18,
      category: data.category?.trim() || "Services",
      isActive: data.isActive !== undefined ? data.isActive : true,
    })
    .returning();

  await logAuditEntry(orgId, userId, "create", "product", product.id, {
    name: product.name,
    sku: product.sku,
    unitPrice: product.unitPrice,
  });

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/invoices");

  return product;
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    sku?: string;
    description?: string;
    unitPrice?: number;
    currency?: string;
    taxRatePercent?: number;
    category?: string;
    isActive?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const [updated] = await db
    .update(products)
    .set({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.sku !== undefined ? { sku: data.sku ? data.sku.trim() : null } : {}),
      ...(data.description !== undefined ? { description: data.description ? data.description.trim() : null } : {}),
      ...(data.unitPrice !== undefined ? { unitPrice: data.unitPrice } : {}),
      ...(data.currency ? { currency: data.currency } : {}),
      ...(data.taxRatePercent !== undefined ? { taxRatePercent: data.taxRatePercent } : {}),
      ...(data.category ? { category: data.category.trim() } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    })
    .where(and(eq(products.id, id), eq(products.orgId, orgId)))
    .returning();

  await logAuditEntry(orgId, userId, "update", "product", id, data);

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/invoices");

  return updated;
}

export async function deleteProduct(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.orgId, orgId)));

  await logAuditEntry(orgId, userId, "delete", "product", id, { id });

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/invoices");

  return { success: true };
}
