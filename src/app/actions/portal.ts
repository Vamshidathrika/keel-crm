"use server";

import { db } from "@/db";
import { deliverables, clients, activities, messageRecords } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateDeliverableStatus(
  portalToken: string,
  deliverableId: string,
  status: "approved" | "changes_requested",
  clientFeedback?: string
) {
  // 1. Verify portal token
  const client = await db.query.clients.findFirst({
    where: eq(clients.portalToken, portalToken),
  });

  if (!client) throw new Error("Invalid portal token");

  // 2. Update Deliverable Status
  const [updated] = await db
    .update(deliverables)
    .set({
      status,
      clientFeedback: clientFeedback || null,
    })
    .where(eq(deliverables.id, deliverableId))
    .returning();

  // 3. Log Activity on CRM Timeline
  await db.insert(activities).values({
    orgId: client.orgId,
    type: "system",
    body: `Client "${client.name}" ${status === "approved" ? "APPROVED" : "REQUESTED CHANGES ON"} deliverable "${updated.title}" via Client Portal.`,
    source: "system",
  });

  revalidatePath(`/portal/${portalToken}`);
  return updated;
}
