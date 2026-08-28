"use server";

import { db } from "@/db";
import { pipelines, stages } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assert, canManagePipelines } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, ne, asc } from "drizzle-orm";
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

export async function createPipeline(
  name: string,
  isDefault: boolean = false,
  customStages?: Array<{ name: string; probability: number; color: string; type: "open" | "won" | "lost" }>
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  assert(canManagePipelines(session.user.role), "Access Denied: Only Admins and Managers can create pipelines.");

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Pipeline name cannot be empty.");

  // If set to default, unset other defaults
  if (isDefault) {
    await db
      .update(pipelines)
      .set({ isDefault: false })
      .where(eq(pipelines.orgId, session.user.orgId));
  }

  const [pipeline] = await db
    .insert(pipelines)
    .values({
      orgId: session.user.orgId,
      name: trimmedName,
      isDefault,
    })
    .returning();

  // Create default starter stages if none provided
  const initialStages = customStages && customStages.length > 0
    ? customStages
    : [
        { name: "Discovery", probability: 20, color: "#3B82F6", type: "open" as const },
        { name: "Demo / Presentation", probability: 40, color: "#8B5CF6", type: "open" as const },
        { name: "Proposal / Quote", probability: 60, color: "#F59E0B", type: "open" as const },
        { name: "Negotiation", probability: 80, color: "#EC4899", type: "open" as const },
        { name: "Closed Won", probability: 100, color: "#10B981", type: "won" as const },
        { name: "Closed Lost", probability: 0, color: "#EF4444", type: "lost" as const },
      ];

  for (let i = 0; i < initialStages.length; i++) {
    const st = initialStages[i];
    await db.insert(stages).values({
      pipelineId: pipeline.id,
      name: st.name,
      order: i + 1,
      probability: st.probability,
      color: st.color,
      type: st.type,
    });
  }

  await logAuditEntry(session.user.orgId, session.user.id, "create", "pipeline", pipeline.id, {
    name: pipeline.name,
    isDefault,
  });

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/settings");

  return getPipelines();
}

export async function updatePipeline(
  id: string,
  data: {
    name?: string;
    isDefault?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  assert(canManagePipelines(session.user.role), "Access Denied: Only Admins and Managers can edit pipelines.");

  if (data.isDefault) {
    await db
      .update(pipelines)
      .set({ isDefault: false })
      .where(and(eq(pipelines.orgId, session.user.orgId), ne(pipelines.id, id)));
  }

  const [updated] = await db
    .update(pipelines)
    .set({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(typeof data.isDefault === "boolean" ? { isDefault: data.isDefault } : {}),
    })
    .where(and(eq(pipelines.id, id), eq(pipelines.orgId, session.user.orgId)))
    .returning();

  await logAuditEntry(session.user.orgId, session.user.id, "update", "pipeline", id, data);

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/settings");

  return updated;
}

export async function deletePipeline(pipelineId: string, fallbackPipelineId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  assert(canManagePipelines(session.user.role), "Access Denied: Only Admins and Managers can delete pipelines.");

  const allOrgPipelines = await db.query.pipelines.findMany({
    where: eq(pipelines.orgId, session.user.orgId),
  });

  if (allOrgPipelines.length <= 1) {
    throw new Error("Cannot delete your only sales pipeline. At least one pipeline is required.");
  }

  // Handle deals re-assignment if fallback is provided
  if (fallbackPipelineId && fallbackPipelineId !== pipelineId) {
    const fallbackStages = await db.query.stages.findMany({
      where: eq(stages.pipelineId, fallbackPipelineId),
      orderBy: [asc(stages.order)],
    });
    const targetStageId = fallbackStages[0]?.id;
    if (targetStageId) {
      const { deals } = await import("@/db/schema");
      await db
        .update(deals)
        .set({ pipelineId: fallbackPipelineId, stageId: targetStageId })
        .where(eq(deals.pipelineId, pipelineId));
    }
  }

  // Delete all stages under this pipeline (deals cascade or re-assigned)
  await db.delete(stages).where(eq(stages.pipelineId, pipelineId));
  await db.delete(pipelines).where(and(eq(pipelines.id, pipelineId), eq(pipelines.orgId, session.user.orgId)));

  await logAuditEntry(session.user.orgId, session.user.id, "delete", "pipeline", pipelineId, {
    fallbackPipelineId,
  });

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/settings");

  return getPipelines();
}

export async function reorderStages(pipelineId: string, stageIdsInOrder: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  assert(canManagePipelines(session.user.role), "Access Denied: Only Admins/Managers can reorder stages.");

  // Verify pipeline ownership
  const pipe = await db.query.pipelines.findFirst({
    where: and(eq(pipelines.id, pipelineId), eq(pipelines.orgId, session.user.orgId)),
  });

  if (!pipe) throw new Error("Pipeline not found");

  for (let i = 0; i < stageIdsInOrder.length; i++) {
    const stageId = stageIdsInOrder[i];
    await db
      .update(stages)
      .set({ order: i + 1 })
      .where(and(eq(stages.id, stageId), eq(stages.pipelineId, pipelineId)));
  }

  await logAuditEntry(session.user.orgId, session.user.id, "reorder", "pipeline_stages", pipelineId, {
    stageOrder: stageIdsInOrder,
  });

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/settings");
  return getStagesByPipeline(pipelineId);
}
