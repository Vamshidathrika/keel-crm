"use server";

import { db } from "@/db";
import { activities, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ownerScope } from "@/lib/permissions";
import { eq, and, desc, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { triggerWorkflows } from "@/app/actions/automations";

export async function getActivities(params: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}) {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId, id: userId, role } = session.user;

  const conditions = [eq(activities.orgId, orgId)];

  const relationConditions = [];
  if (params.contactId) {
    relationConditions.push(eq(activities.relatedContactId, params.contactId));
  }
  if (params.companyId) {
    relationConditions.push(eq(activities.relatedCompanyId, params.companyId));
  }
  if (params.dealId) {
    relationConditions.push(eq(activities.relatedDealId, params.dealId));
  }

  if (relationConditions.length > 0) {
    conditions.push(or(...relationConditions)!);
  }

  return db.query.activities.findMany({
    where: and(...conditions),
    orderBy: [desc(activities.occurredAt)],
    with: {
      actorUserId: {
        columns: {
          name: true,
        }
      }
    }
  });
}

export async function createActivity(data: {
  type: "call" | "email" | "whatsapp" | "note" | "meeting" | "stage_change" | "task" | "ai" | "system";
  body: string;
  relatedContactId?: string;
  relatedCompanyId?: string;
  relatedDealId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const [activity] = await db
    .insert(activities)
    .values({
      orgId,
      type: data.type,
      body: data.body,
      relatedContactId: data.relatedContactId || null,
      relatedCompanyId: data.relatedCompanyId || null,
      relatedDealId: data.relatedDealId || null,
      actorUserId: userId,
      metadata: data.metadata || {},
      source: "manual",
      occurredAt: data.occurredAt || new Date().toISOString(),
    })
    .returning();

  await triggerWorkflows(orgId, "activity_created", activity.id, {
    activityId: activity.id,
    contactId: activity.relatedContactId,
    companyId: activity.relatedCompanyId,
    dealId: activity.relatedDealId,
    type: activity.type,
  });

  revalidatePath("/dashboard");
  return activity;
}
