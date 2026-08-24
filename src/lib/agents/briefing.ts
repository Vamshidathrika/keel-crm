import { db } from "@/db";
import { deals, contacts, tasks, agentRuns } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { AgentRunOutput } from "./types";

export async function runBriefingAgent(orgId: string): Promise<AgentRunOutput> {
  const startTime = Date.now();
  const thoughtProcess: string[] = [];

  thoughtProcess.push(`[Rollup] Compiling daily executive pipeline briefing.`);

  // 1. Total open pipeline value
  const allDeals = await db.query.deals.findMany({
    where: eq(deals.orgId, orgId),
    with: { stage: true },
  });

  const openDeals = allDeals.filter((d) => d.stage?.type === "open");
  const totalPipeline = openDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedPipeline = openDeals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
  const atRiskCount = openDeals.filter((d) => (d.healthFlags || []).length > 0).length;

  // 2. Hot leads count
  const allContacts = await db.query.contacts.findMany({
    where: eq(contacts.orgId, orgId),
  });
  const hotLeads = allContacts.filter((c) => (c.score || 0) >= 75);

  // 3. Pending tasks
  const pendingTasks = await db.query.tasks.findMany({
    where: and(eq(tasks.orgId, orgId), eq(tasks.isDone, false)),
  });

  thoughtProcess.push(`[Metrics] ${openDeals.length} active deals totaling ₹${(totalPipeline / 100000).toFixed(1)}L (Weighted: ₹${(weightedPipeline / 100000).toFixed(1)}L).`);
  thoughtProcess.push(`[Signals] ${hotLeads.length} Hot Leads detected. ${atRiskCount} deals require tactical intervention.`);

  const summary = `Executive Briefing: Active Pipeline is ₹${(totalPipeline / 100000).toFixed(1)} Lakh across ${openDeals.length} deals. Identified ${hotLeads.length} hot prospects and ${atRiskCount} at-risk opportunities requiring rep focus today.`;

  const [runRecord] = await db
    .insert(agentRuns)
    .values({
      orgId,
      agentType: "briefing",
      targetEntityType: "org",
      targetEntityId: orgId,
      status: "completed",
      confidenceScore: 0.98,
      thoughtProcess,
      summary,
      toolsInvoked: [
        {
          tool: "rollupPipelineStats",
          params: { openDealsCount: openDeals.length, totalPipeline },
          result: { openDeals: openDeals.length, hotLeads: hotLeads.length, atRiskCount },
        },
      ],
      executionDurationMs: Date.now() - startTime,
    })
    .returning();

  return {
    runId: runRecord.id,
    status: "completed",
    confidenceScore: 0.98,
    thoughtProcess,
    summary,
    toolsInvoked: [],
    actionsProposed: [],
    executionDurationMs: Date.now() - startTime,
  };
}
