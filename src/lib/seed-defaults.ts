import { db } from "@/db";
import { pipelines, stages } from "@/db/schema";

/** Every new org gets a default pipeline with Keel's standard 6-stage flow. */
export async function createDefaultPipeline(orgId: string) {
  const [pipeline] = await db
    .insert(pipelines)
    .values({ orgId, name: "Sales Pipeline", isDefault: true })
    .returning();

  await db.insert(stages).values([
    { pipelineId: pipeline.id, name: "New", order: 0, type: "open", probability: 10, color: "#38bdf8" },
    { pipelineId: pipeline.id, name: "Contacted", order: 1, type: "open", probability: 25, color: "#2f5dff" },
    { pipelineId: pipeline.id, name: "Qualified", order: 2, type: "open", probability: 50, color: "#e8a33d" },
    { pipelineId: pipeline.id, name: "Proposal", order: 3, type: "open", probability: 70, color: "#f97316" },
    { pipelineId: pipeline.id, name: "Won", order: 4, type: "won", probability: 100, color: "#16a34a" },
    { pipelineId: pipeline.id, name: "Lost", order: 5, type: "lost", probability: 0, color: "#e11d48" },
  ]);

  return pipeline;
}
