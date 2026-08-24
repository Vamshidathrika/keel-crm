import { db } from "@/db";
import { pipelines, stages, orgWidgets, agentConfigs, notifications } from "@/db/schema";
import { WIDGET_REGISTRY } from "@/lib/widgets/registry";

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

/** Complete multi-tenant bootstrap: pipeline, core widgets, agent configs, and welcome notification. */
export async function seedOrganizationDefaults(orgId: string, userId?: string) {
  // 1. Default Pipeline
  await createDefaultPipeline(orgId);

  // 2. Default Core Widgets
  const defaultWidgets = WIDGET_REGISTRY.filter((w) => w.defaultFor === "all");
  for (let i = 0; i < defaultWidgets.length; i++) {
    await db
      .insert(orgWidgets)
      .values({
        orgId,
        widgetKey: defaultWidgets[i].key,
        isEnabled: true,
        position: i,
      })
      .catch(() => {});
  }

  // 3. Default Autonomous Agent Configs
  const defaultAgents: Array<"prospector" | "deal_doctor" | "guardian" | "briefing"> = [
    "prospector",
    "deal_doctor",
    "guardian",
    "briefing",
  ];
  for (const agentType of defaultAgents) {
    await db
      .insert(agentConfigs)
      .values({
        orgId,
        agentType,
        isEnabled: true,
        executionMode: "supervised",
        model: "gemini-2.5-flash",
        sweepIntervalHours: 24,
      })
      .catch(() => {});
  }

  // 4. Welcome Notification
  if (userId) {
    await db
      .insert(notifications)
      .values({
        orgId,
        userId,
        title: "Welcome to Keel CRM",
        body: "Your isolated workspace, pipelines, and autonomous AI agents are ready.",
        type: "info",
        isRead: false,
      })
      .catch(() => {});
  }
}
