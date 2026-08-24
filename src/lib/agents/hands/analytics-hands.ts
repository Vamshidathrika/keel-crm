import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/db";
import { deals, contacts, tasks, invoices } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const getPipelineMetricsTool = tool(
  async ({ orgId }) => {
    const allDeals = await db.query.deals.findMany({
      where: eq(deals.orgId, orgId),
      with: { stage: true },
    });

    const openDeals = allDeals.filter((d) => d.stage?.type === "open");
    const wonDeals = allDeals.filter((d) => d.stage?.type === "won");
    const lostDeals = allDeals.filter((d) => d.stage?.type === "lost");

    const totalPipeline = openDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedPipeline = openDeals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
    const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);

    const atRiskDeals = openDeals.filter((d) => (d.healthFlags || []).length > 0);

    return {
      status: "success",
      totalDeals: allDeals.length,
      openDealsCount: openDeals.length,
      wonDealsCount: wonDeals.length,
      lostDealsCount: lostDeals.length,
      totalPipelineValue: totalPipeline,
      weightedForecastValue: weightedPipeline,
      closedWonValue: wonValue,
      atRiskDealsCount: atRiskDeals.length,
      winRatePercent: (wonDeals.length + lostDeals.length) > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0,
    };
  },
  {
    name: "crm_get_pipeline_metrics",
    description: "Retrieve aggregated pipeline KPIs: total pipeline, weighted forecast, closed-won value, and win rate.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
    }),
  }
);
