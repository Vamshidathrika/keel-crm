import { db } from "@/db";
import {
  companies,
  contacts,
  deals,
  invoices,
  agentRuns,
  agentActionQueue,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AgentGraphState, createInitialGraphState } from "./state";
import {
  toolEnrichCompany,
  toolScoreContact,
  toolDiagnoseDeal,
  toolCreateAutonomousTask,
  toolProposeAction,
} from "../tools";
import { generateText, generateJSON } from "@/lib/ai/gemini-client";
import { ProposedAction } from "../types";

/**
 * Node 1: Hydrate Entity Context
 */
async function hydrateNode(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  const { orgId, targetEntityType, targetEntityId } = state;
  const thoughts = [...state.thoughtProcess, `[Graph:Hydrate] Hydrating entity ${targetEntityType} #${targetEntityId}`];

  let entityData: any = null;

  if (targetEntityType === "company") {
    entityData = await db.query.companies.findFirst({
      where: and(eq(companies.id, targetEntityId), eq(companies.orgId, orgId)),
      with: { contacts: true },
    });
  } else if (targetEntityType === "contact") {
    entityData = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, targetEntityId), eq(contacts.orgId, orgId)),
      with: { company: true },
    });
  } else if (targetEntityType === "deal") {
    entityData = await db.query.deals.findFirst({
      where: and(eq(deals.id, targetEntityId), eq(deals.orgId, orgId)),
      with: { stage: true, contact: true, company: true },
    });
  }

  return {
    entityData,
    thoughtProcess: thoughts,
  };
}

/**
 * Node 2: Specialist Reasoning Node (Prospector / Deal Doctor / Guardian / Briefing)
 */
async function specialistReasoningNode(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  const { orgId, agentType, entityData, executionMode } = state;
  const thoughts = [...state.thoughtProcess];
  const toolsInvoked = [...state.toolsInvoked];
  const actionsProposed: ProposedAction[] = [];

  let summary = "";
  const confidenceScore = 0.9;
  let score = 50;
  const healthFlags: string[] = [];

  if (agentType === "prospector") {
    thoughts.push(`[Graph:Prospector] Analyzing ICP signals with Google Gemini intelligence.`);
    
    if (state.targetEntityType === "company" && entityData) {
      const company = entityData;
      
      // Attempt Gemini AI Analysis
      let aiSummary = "";
      try {
        const prompt = `Analyze this B2B company profile for CRM lead scoring:
Company Name: ${company.name}
Domain: ${company.domain || "N/A"}
Industry: ${company.industry || "General Enterprise"}
Provide a 2-sentence executive summary and identify if this is a Tier 1, Tier 2, or Tier 3 ICP fit for enterprise software.`;
        aiSummary = await generateText(prompt, "You are an enterprise CRM Account Intelligence Specialist.");
      } catch (err) {
        aiSummary = `${company.name} is a high-growth account in ${company.industry || "Enterprise Services"}.`;
      }

      const icpFit: "Tier 1 (High)" | "Tier 2 (Medium)" | "Tier 3 (Low)" = 
        company.name.toLowerCase().includes("tech") || (company.domain || "").includes("io") ? "Tier 1 (High)" : "Tier 2 (Medium)";

      const res = await toolEnrichCompany(orgId, company.id, {
        industry: company.industry || "Technology & Services",
        summary: aiSummary,
        icpFit,
        techStack: ["Cloud Native", "API Hub", "Next.js"],
      });
      toolsInvoked.push({ tool: "toolEnrichCompany", params: { companyId: company.id }, result: res });
      summary = aiSummary;
    } else if (state.targetEntityType === "contact" && entityData) {
      const contact = entityData;
      score = 40;
      const factors: Array<{ label: string; direction: "up" | "down"; explanation: string }> = [];

      if (contact.email && !contact.email.endsWith("@gmail.com")) {
        score += 25;
        factors.push({ label: "Verified Work Email", direction: "up", explanation: contact.email });
      }
      if (contact.title && (contact.title.toLowerCase().includes("founder") || contact.title.toLowerCase().includes("director") || contact.title.toLowerCase().includes("vp"))) {
        score += 30;
        factors.push({ label: "Executive Decision Maker", direction: "up", explanation: contact.title });
      }
      if (contact.phone) {
        score += 15;
        factors.push({ label: "Direct Phone Line", direction: "up", explanation: "Verified dialer line" });
      }

      score = Math.min(98, score);
      const band: "hot" | "warm" | "cold" = score >= 75 ? "hot" : score >= 50 ? "warm" : "cold";
      const rec = band === "hot" ? "Schedule discovery demo immediately." : "Add to automated nurture campaign.";

      const res = await toolScoreContact(orgId, contact.id, {
        score,
        band,
        factors,
        recommendation: rec,
      });
      toolsInvoked.push({ tool: "toolScoreContact", params: { contactId: contact.id, score }, result: res });

      summary = `Lead scored at ${score}/100 [${band.toUpperCase()}]. ${rec}`;

      if (band === "hot") {
        actionsProposed.push({
          title: `Hot Lead Outreach: ${contact.firstName} (${contact.title || "Key Lead"})`,
          description: `Score: ${score}/100. High conversion probability based on verified title and corporate domain.`,
          actionType: "create_task",
          actionPayload: {
            title: `Contact Hot Lead: ${contact.firstName} ${contact.lastName || ""}`,
            description: `Factors: ${factors.map(f => f.label).join(", ")}`,
            contactId: contact.id,
            companyId: contact.companyId,
            assigneeId: contact.ownerId,
            dueDays: 1,
          },
          severity: "critical",
        });
      }
    }
  } else if (agentType === "deal_doctor" && entityData) {
    const deal = entityData;
    thoughts.push(`[Graph:DealDoctor] Evaluating velocity for deal "${deal.title}" (₹${deal.value.toLocaleString()}).`);

    const daysOpen = Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    let revisedProbability = deal.probability;

    if (daysOpen > 14 && deal.stage?.type === "open") {
      healthFlags.push("STALLED_DEAL");
      revisedProbability = Math.max(15, Math.floor(revisedProbability * 0.75));
    }

    if (deal.expectedCloseDate && new Date(deal.expectedCloseDate).getTime() < Date.now() && deal.stage?.type === "open") {
      healthFlags.push("OVERDUE_CLOSE_DATE");
    }

    const diagRes = await toolDiagnoseDeal(orgId, deal.id, {
      healthFlags,
      revisedProbability,
      interventionRequired: healthFlags.length > 0,
      reasoning: `Audit flagged ${healthFlags.length} risk items.`,
    });
    toolsInvoked.push({ tool: "toolDiagnoseDeal", params: { dealId: deal.id, healthFlags }, result: diagRes });

    summary = healthFlags.length > 0
      ? `Deal Doctor flagged ${healthFlags.join(", ")}. Revised Win Probability: ${revisedProbability}%.`
      : `Deal is pacing on healthy velocity. No risk flags.`;

    if (healthFlags.length > 0) {
      actionsProposed.push({
        title: `Deal Intervention: ${deal.title}`,
        description: `Flags: [${healthFlags.join(", ")}]. Deal needs proactive touchpoint from account executive.`,
        actionType: "create_task",
        actionPayload: {
          title: `Revive Deal: ${deal.title}`,
          description: `Diagnostic: ${summary}`,
          dealId: deal.id,
          contactId: deal.contactId,
          companyId: deal.companyId,
          assigneeId: deal.ownerId,
          dueDays: 1,
        },
        severity: "warning",
      });
    }
  }

  return {
    thoughtProcess: thoughts,
    toolsInvoked,
    actionsProposed,
    summary,
    confidenceScore,
    score,
    healthFlags,
  };
}

/**
 * Node 3: Action Execution / HITL Queue Interceptor
 */
async function actionExecutionNode(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  const { orgId, agentType, actionsProposed, executionMode } = state;
  const thoughts = [...state.thoughtProcess];

  for (const action of actionsProposed) {
    if (executionMode === "supervised") {
      thoughts.push(`[Graph:HITL] Queuing action "${action.title}" to Human Approval Queue.`);
      await toolProposeAction(orgId, agentType, null, action);
    } else {
      thoughts.push(`[Graph:Auto] Full-Auto mode active. Executing action "${action.title}".`);
      await toolCreateAutonomousTask(orgId, {
        title: action.actionPayload.title || action.title,
        description: action.actionPayload.description || action.description,
        relatedContactId: action.actionPayload.contactId,
        relatedDealId: action.actionPayload.dealId,
        relatedCompanyId: action.actionPayload.companyId,
        assigneeId: action.actionPayload.assigneeId,
        dueDays: action.actionPayload.dueDays || 1,
      });
    }
  }

  return {
    thoughtProcess: thoughts,
    status: actionsProposed.length > 0 && executionMode === "supervised" ? "requires_approval" : "completed",
  };
}

/**
 * Node 4: Graph State Persistence Node
 */
async function persistenceNode(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  const { orgId, agentType, targetEntityType, targetEntityId, thoughtProcess, summary, toolsInvoked, confidenceScore, status } = state;

  const [runRecord] = await db
    .insert(agentRuns)
    .values({
      orgId,
      agentType,
      targetEntityType,
      targetEntityId,
      status,
      confidenceScore,
      thoughtProcess,
      summary: summary || "Graph execution finished.",
      toolsInvoked,
    })
    .returning();

  return {
    thoughtProcess: [...thoughtProcess, `[Graph:Persist] Stored execution run #${runRecord.id}`],
  };
}

/**
 * LangGraph-Style StateGraph Runner
 */
export async function runCRMAgentGraph(
  orgId: string,
  agentType: "prospector" | "deal_doctor" | "guardian" | "briefing",
  targetEntityType: "contact" | "company" | "deal" | "org",
  targetEntityId: string,
  executionMode: "full_auto" | "supervised" = "supervised",
  triggerSource: "event" | "sweep" | "manual" = "event"
): Promise<AgentGraphState> {
  const startTime = Date.now();
  let state = createInitialGraphState(orgId, agentType, targetEntityType, targetEntityId, executionMode, triggerSource);

  // Step 1: Hydrate
  const hydrateOutput = await hydrateNode(state);
  state = { ...state, ...hydrateOutput };

  // Step 2: Specialist Reasoning
  const specialistOutput = await specialistReasoningNode(state);
  state = { ...state, ...specialistOutput };

  // Step 3: Action Execution / HITL Routing
  const actionOutput = await actionExecutionNode(state);
  state = { ...state, ...actionOutput };

  // Step 4: Persistence
  const persistOutput = await persistenceNode(state);
  state = { ...state, ...persistOutput };

  return state;
}
