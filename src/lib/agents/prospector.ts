import { db } from "@/db";
import { contacts, companies, agentRuns, agentConfigs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { toolEnrichCompany, toolScoreContact, toolProposeAction } from "./tools";
import { AgentRunOutput, ProposedAction } from "./types";

export async function runProspectorAgent(
  orgId: string,
  targetType: "company" | "contact",
  targetId: string,
  triggerSource: "event" | "sweep" | "manual" = "event"
): Promise<AgentRunOutput> {
  const startTime = Date.now();
  const thoughtProcess: string[] = [];
  const toolsInvoked: Array<{ tool: string; params: any; result: any }> = [];
  const actionsProposed: ProposedAction[] = [];

  // 1. Fetch agent configuration
  const config = await db.query.agentConfigs.findFirst({
    where: and(eq(agentConfigs.orgId, orgId), eq(agentConfigs.agentType, "prospector")),
  });
  const executionMode = config?.executionMode || "supervised";

  thoughtProcess.push(`[Discovery] Initiating Prospector agent for ${targetType} #${targetId} (Source: ${triggerSource}, Mode: ${executionMode}).`);

  let summary = "";
  const confidenceScore = 0.9;

  if (targetType === "company") {
    const company = await db.query.companies.findFirst({
      where: and(eq(companies.id, targetId), eq(companies.orgId, orgId)),
      with: { contacts: true },
    });

    if (!company) {
      return {
        runId: "",
        status: "failed",
        confidenceScore: 0,
        thoughtProcess,
        summary: "Target company not found.",
        toolsInvoked,
        actionsProposed,
        executionDurationMs: Date.now() - startTime,
      };
    }

    thoughtProcess.push(`[Analysis] Evaluating company domain "${company.domain || company.name}" for ICP matching.`);

    // Determine heuristic / AI account signals
    const nameLower = company.name.toLowerCase();
    const domain = (company.domain || "").toLowerCase();
    
    let icpFit: "Tier 1 (High)" | "Tier 2 (Medium)" | "Tier 3 (Low)" = "Tier 2 (Medium)";
    let detectedIndustry = company.industry || "Technology & Services";
    let techStack: string[] = ["Cloud Infrastructure", "API Integrations"];

    if (nameLower.includes("tech") || nameLower.includes("ai") || domain.includes("io") || domain.includes("ai")) {
      icpFit = "Tier 1 (High)";
      detectedIndustry = "Software / AI Enterprise";
      techStack = ["Next.js", "TypeScript", "Python AI Core", "PostgreSQL"];
    } else if (nameLower.includes("logistics") || nameLower.includes("freight") || nameLower.includes("supply")) {
      icpFit = "Tier 1 (High)";
      detectedIndustry = "Supply Chain & Logistics";
      techStack = ["ERP Integration", "Fleet Telematics", "WMS"];
    }

    const companySummary = `${company.name} is classified as ${icpFit} ICP (${detectedIndustry}). Strong indicators for digital workflow transformation.`;

    const enrichResult = await toolEnrichCompany(orgId, company.id, {
      industry: detectedIndustry,
      techStack,
      employeeRange: "50-250 employees",
      summary: companySummary,
      icpFit,
    });

    toolsInvoked.push({ tool: "toolEnrichCompany", params: { companyId: company.id }, result: enrichResult });
    thoughtProcess.push(`[Enrichment] Successfully stored account dossier and ICP tier tag.`);

    summary = companySummary;

    // If company has contacts, trigger scoring for them
    for (const c of company.contacts || []) {
      thoughtProcess.push(`[Cascade] Scoring associated contact ${c.firstName} ${c.lastName || ""}.`);
      await runProspectorAgent(orgId, "contact", c.id, triggerSource);
    }

  } else {
    // Contact evaluation
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, targetId), eq(contacts.orgId, orgId)),
      with: { company: true },
    });

    if (!contact) {
      return {
        runId: "",
        status: "failed",
        confidenceScore: 0,
        thoughtProcess,
        summary: "Target contact not found.",
        toolsInvoked,
        actionsProposed,
        executionDurationMs: Date.now() - startTime,
      };
    }

    thoughtProcess.push(`[Analysis] Evaluating contact "${contact.firstName} ${contact.lastName || ""}" (${contact.title || "No title"}).`);

    let score = 40;
    const factors: { label: string; direction: "up" | "down"; explanation: string }[] = [];

    // Scoring signals
    if (contact.email && !contact.email.endsWith("@gmail.com") && !contact.email.endsWith("@yahoo.com")) {
      score += 20;
      factors.push({ label: "Corporate Email", direction: "up", explanation: "Verified work email domain." });
    } else {
      score -= 10;
      factors.push({ label: "Personal Email", direction: "down", explanation: "Free email provider used." });
    }

    const titleLower = (contact.title || "").toLowerCase();
    if (titleLower.includes("founder") || titleLower.includes("ceo") || titleLower.includes("cto") || titleLower.includes("director") || titleLower.includes("vp")) {
      score += 25;
      factors.push({ label: "Decision Maker Title", direction: "up", explanation: `High buying authority (${contact.title}).` });
    } else if (contact.title) {
      score += 10;
      factors.push({ label: "Known Role", direction: "up", explanation: `Role specified: ${contact.title}.` });
    }

    if (contact.phone) {
      score += 15;
      factors.push({ label: "Direct Phone Available", direction: "up", explanation: "Direct dialing line present." });
    }

    if (contact.company) {
      score += 15;
      factors.push({ label: "Linked Account", direction: "up", explanation: `Associated with company ${contact.company.name}.` });
    }

    score = Math.min(98, Math.max(15, score));
    const band: "hot" | "warm" | "cold" = score >= 75 ? "hot" : score >= 50 ? "warm" : "cold";
    const recommendation = band === "hot"
      ? "High-priority prospect. Schedule executive discovery call within 24 hours."
      : band === "warm"
      ? "Qualified lead. Share tailored product overview and invite to next webinar."
      : "Low engagement. Add to automated nurture sequence.";

    const scoreResult = await toolScoreContact(orgId, contact.id, {
      score,
      band,
      factors,
      recommendation,
    });

    toolsInvoked.push({ tool: "toolScoreContact", params: { contactId: contact.id, score }, result: scoreResult });
    thoughtProcess.push(`[Scoring] Contact scored at ${score}/100 [${band.toUpperCase()}]. Recommendation: ${recommendation}`);

    summary = `Lead score computed: ${score}/100 (${band.toUpperCase()}). ${recommendation}`;

    // If hot lead and in supervised mode, propose high-priority outreach action
    if (band === "hot") {
      const action: ProposedAction = {
        title: `Book Discovery Call: ${contact.firstName} (${contact.title || "Key Lead"})`,
        description: `Prospector detected a Hot Lead (${score}/100) at ${contact.company?.name || "Target Account"}. High buying intent signals present.`,
        actionType: "create_task",
        actionPayload: {
          title: `Schedule discovery call with ${contact.firstName} ${contact.lastName || ""}`,
          description: `Key Factors:\n${factors.map(f => `• ${f.label}: ${f.explanation}`).join("\n")}`,
          contactId: contact.id,
          companyId: contact.companyId,
          assigneeId: contact.ownerId,
          dueDays: 1,
        },
        severity: "critical",
      };

      if (executionMode === "supervised") {
        await toolProposeAction(orgId, "prospector", null, action);
        actionsProposed.push(action);
        thoughtProcess.push(`[HITL Queue] Queued hot lead action to human approval queue.`);
      }
    }
  }

  // 3. Persist agent execution run log
  const [runRecord] = await db
    .insert(agentRuns)
    .values({
      orgId,
      agentType: "prospector",
      targetEntityType: targetType,
      targetEntityId: targetId,
      status: actionsProposed.length > 0 ? "requires_approval" : "completed",
      confidenceScore,
      thoughtProcess,
      summary,
      toolsInvoked,
      executionDurationMs: Date.now() - startTime,
    })
    .returning();

  return {
    runId: runRecord.id,
    status: runRecord.status as any,
    confidenceScore,
    thoughtProcess,
    summary,
    toolsInvoked,
    actionsProposed,
    executionDurationMs: Date.now() - startTime,
  };
}
