"use server";

import { db } from "@/db";
import { pipelines, stages } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assert, canManagePipelines } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPipelines() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.pipelines.findMany({
    where: eq(pipelines.orgId, session.user.orgId),
    with: {
      stages: {
        orderBy: [asc(stages.order)],
      },
    },
  });
}

export async function getStagesByPipeline(pipelineId: string) {
  const session = await auth();
  if (!session?.user) return [];

  // Verify pipeline belongs to org
  const pipe = await db.query.pipelines.findFirst({
    where: and(eq(pipelines.id, pipelineId), eq(pipelines.orgId, session.user.orgId)),
  });

  if (!pipe) return [];

  return db.query.stages.findMany({
    where: eq(stages.pipelineId, pipelineId),
    orderBy: [asc(stages.order)],
  });
}

export async function updateStage(
  id: string,
  data: {
    name?: string;
    probability?: number;
    color?: string;
    order?: number;
    type?: "open" | "won" | "lost";
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  assert(canManagePipelines(session.user.role), "Access Denied: Only Admins/Managers can edit pipelines.");

  const [updated] = await db
    .update(stages)
    .set({
      name: data.name,
      probability: data.probability,
      color: data.color,
      order: data.order,
      type: data.type,
    })
    .where(eq(stages.id, id))
    .returning();

  await logAuditEntry(
    session.user.orgId,
    session.user.id,
    "update",
    "stage",
    id,
    data as Record<string, unknown>
  );

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/deals");
  return updated;
}

export async function createStage(data: {
  pipelineId: string;
  name: string;
  probability: number;
  color: string;
  order: number;
  type: "open" | "won" | "lost";
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  assert(canManagePipelines(session.user.role), "Access Denied");

  const [stage] = await db
    .insert(stages)
    .values({
      pipelineId: data.pipelineId,
      name: data.name.trim(),
      probability: data.probability,
      color: data.color,
      order: data.order,
      type: data.type,
    })
    .returning();

  await logAuditEntry(session.user.orgId, session.user.id, "create", "stage", stage.id, {
    pipelineId: data.pipelineId,
    name: stage.name,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/deals");
  return stage;
}

export async function deleteStage(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  assert(canManagePipelines(session.user.role), "Access Denied");

  await db.delete(stages).where(eq(stages.id, id));

  await logAuditEntry(session.user.orgId, session.user.id, "delete", "stage", id, {
    stageId: id,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/deals");
  return { success: true };
}
