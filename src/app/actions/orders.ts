"use server";

import { db } from "@/db";
import { orders, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getOrders() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.orders.findMany({
    where: eq(orders.orgId, session.user.orgId),
    with: { client: true },
    orderBy: [desc(orders.createdAt)],
  });
}

export async function createOrder(data: {
  clientName: string;
  itemsSummary: string;
  totalAmount: string;
  fulfillmentStatus?: string;
  deliveryEta?: string;
  clientId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;
  const orderNumber = `ORD-${Math.floor(100 + Math.random() * 900)}`;

  const [newOrder] = await db
    .insert(orders)
    .values({
      orgId,
      orderNumber,
      clientName: data.clientName.trim(),
      itemsSummary: data.itemsSummary.trim(),
      totalAmount: data.totalAmount.trim(),
      fulfillmentStatus: data.fulfillmentStatus || "Processing",
      deliveryEta: data.deliveryEta || null,
      clientId: data.clientId || null,
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "system",
    body: `New Order ${newOrder.orderNumber} placed by ${newOrder.clientName} (${newOrder.totalAmount})`,
    source: "manual",
  });

  revalidatePath("/dashboard/orders");
  return newOrder;
}

export async function updateOrderStatus(id: string, fulfillmentStatus: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [updated] = await db
    .update(orders)
    .set({ fulfillmentStatus })
    .where(and(eq(orders.id, id), eq(orders.orgId, session.user.orgId)))
    .returning();

  revalidatePath("/dashboard/orders");
  return updated;
}
