import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/db";
import { deals, stages, activities, pipelines } from "@/db/schema";
import { eq, and, desc, like } from "drizzle-orm";

export const searchDealsTool = tool(
  async ({ orgId, query, stageType, limit = 15 }) => {
    const allDeals = await db.query.deals.findMany({
      where: eq(deals.orgId, orgId),
      with: {
        stage: true,
        contact: true,
        company: true,
        owner: true,
      },
      orderBy: [desc(deals.createdAt)],
      limit,
    });

    let filtered = allDeals;
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter((d) => d.title.toLowerCase().includes(q));
    }
    if (stageType) {
      filtered = filtered.filter((d) => d.stage?.type === stageType);
    }

    return {
      status: "success",
      count: filtered.length,
      deals: filtered.map((d) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        currency: d.currency,
        stage: d.stage?.name || "Unknown",
        stageType: d.stage?.type || "open",
        probability: d.probability,
        healthFlags: d.healthFlags,
        contactName: d.contact ? `${d.contact.firstName} ${d.contact.lastName || ""}`.trim() : null,
        companyName: d.company?.name || null,
        ownerName: d.owner?.name || null,
      })),
    };
  },
  {
    name: "crm_search_deals",
    description: "Search deals in the pipeline with optional stage type or title filters.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      query: z.string().optional().describe("Search keyword for deal title"),
      stageType: z.enum(["open", "won", "lost"]).optional().describe("Filter by stage status"),
      limit: z.number().optional().default(15),
    }),
  }
);

export const createDealTool = tool(
  async ({ orgId, title, value, stageId, pipelineId, contactId, companyId, ownerId }) => {
    let targetPipelineId = pipelineId;
    let targetStageId = stageId;

    if (!targetPipelineId || !targetStageId) {
      const defaultPipeline = await db.query.pipelines.findFirst({
        where: and(eq(pipelines.orgId, orgId), eq(pipelines.isDefault, true)),
        with: { stages: true },
      });

      if (defaultPipeline && defaultPipeline.stages.length > 0) {
        targetPipelineId = targetPipelineId || defaultPipeline.id;
        targetStageId = targetStageId || defaultPipeline.stages[0].id;
      }
    }

    if (!targetPipelineId || !targetStageId) {
      return { status: "error", error: "No valid pipeline/stage found for organization." };
    }

    const [newDeal] = await db
      .insert(deals)
      .values({
        orgId,
        title: title.trim(),
        value: value || 0,
        pipelineId: targetPipelineId,
        stageId: targetStageId,
        contactId: contactId || null,
        companyId: companyId || null,
        ownerId: ownerId || null,
        currency: "INR",
        probability: 20,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "note",
      relatedDealId: newDeal.id,
      body: `🤖 Agent Hands created deal: "${newDeal.title}" (₹${newDeal.value.toLocaleString()})`,
      source: "ai",
    });

    return {
      status: "success",
      summary: `Created deal "${newDeal.title}" (#${newDeal.id}) with value ₹${newDeal.value.toLocaleString()}`,
      dealId: newDeal.id,
    };
  },
  {
    name: "crm_create_deal",
    description: "Create a new opportunity or deal in the sales pipeline.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      title: z.string().describe("Deal title"),
      value: z.number().describe("Deal value amount"),
      pipelineId: z.string().optional().describe("Pipeline ID"),
      stageId: z.string().optional().describe("Stage ID"),
      contactId: z.string().optional().describe("Primary contact ID"),
      companyId: z.string().optional().describe("Company ID"),
      ownerId: z.string().optional().describe("Sales rep user ID"),
    }),
  }
);

export const moveDealStageTool = tool(
  async ({ orgId, dealId, stageId, note }) => {
    const deal = await db.query.deals.findFirst({
      where: and(eq(deals.id, dealId), eq(deals.orgId, orgId)),
      with: { stage: true },
    });

    if (!deal) return { status: "error", error: "Deal not found" };

    const targetStage = await db.query.stages.findFirst({
      where: eq(stages.id, stageId),
    });

    if (!targetStage) return { status: "error", error: "Target stage not found" };

    await db
      .update(deals)
      .set({
        stageId: targetStage.id,
        probability: targetStage.probability,
      })
      .where(eq(deals.id, dealId));

    await db.insert(activities).values({
      orgId,
      type: "stage_change",
      relatedDealId: dealId,
      relatedContactId: deal.contactId || null,
      body: note || `🤖 Agent Hands transitioned stage: ${deal.stage?.name} ➔ ${targetStage.name}`,
      source: "ai",
    });

    return {
      status: "success",
      summary: `Deal #${dealId} moved to stage "${targetStage.name}" (Win Prob: ${targetStage.probability}%).`,
    };
  },
  {
    name: "crm_move_deal_stage",
    description: "Transition a deal to a new stage in the sales pipeline.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      dealId: z.string().describe("Deal ID"),
      stageId: z.string().describe("Target stage ID"),
      note: z.string().optional().describe("Reason or context note for stage change"),
    }),
  }
);
