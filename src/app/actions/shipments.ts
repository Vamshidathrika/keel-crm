"use server";

import { db } from "@/db";
import { shipments, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getShipments() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.shipments.findMany({
    where: eq(shipments.orgId, session.user.orgId),
    with: { deal: true },
    orderBy: [desc(shipments.createdAt)],
  });
}

export async function createShipment(data: {
  dealName: string;
  carrier: string;
  origin: string;
  destination: string;
  eta: string;
  status?: string;
  mode?: string;
  cost?: string;
  dealId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const [newShipment] = await db
    .insert(shipments)
    .values({
      orgId,
      dealName: data.dealName.trim(),
      carrier: data.carrier.trim(),
      origin: data.origin.trim(),
      destination: data.destination.trim(),
      eta: data.eta.trim(),
      status: data.status || "Booking Confirmed",
      mode: data.mode || "Ocean Freight",
      cost: data.cost || "0",
      dealId: data.dealId || null,
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "system",
    body: `Shipment booked: "${newShipment.dealName}" via ${newShipment.carrier} (ETA: ${newShipment.eta})`,
    source: "manual",
  });

  revalidatePath("/dashboard/shipments");
  return newShipment;
}

export async function updateShipmentStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [updated] = await db
    .update(shipments)
    .set({ status })
    .where(and(eq(shipments.id, id), eq(shipments.orgId, session.user.orgId)))
    .returning();

  revalidatePath("/dashboard/shipments");
  return updated;
}

export async function deleteShipment(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.delete(shipments).where(and(eq(shipments.id, id), eq(shipments.orgId, session.user.orgId)));

  revalidatePath("/dashboard/shipments");
  return { success: true };
}
