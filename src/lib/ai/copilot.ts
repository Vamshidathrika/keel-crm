import { db } from "@/db";
import { contacts, deals, companies, tasks, activities } from "@/db/schema";
import { ownerScope } from "@/lib/permissions";
import { ai } from "./gemini-client";
import { Type } from "@google/genai";
import { eq, and, or, like } from "drizzle-orm";
import { createTask } from "@/app/actions/tasks";
import { createActivity } from "@/app/actions/activities";

// Define the tool declarations for Gemini
export const copilotTools = [
  {
    functionDeclarations: [
      {
        name: "search_contacts",
        description: "Search contacts in the CRM by name, email, phone, or tags.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Fuzzy search query" },
          },
          required: ["query"],
        },
      },
      {
        name: "search_deals",
        description: "Search deal opportunities by title.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Fuzzy search query" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_deal_details",
        description: "Fetch comprehensive deal record details by ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            dealId: { type: Type.STRING, description: "Unique deal ID" },
          },
          required: ["dealId"],
        },
      },
      {
        name: "explain_deal_risk",
        description: "Analyze and explain pipeline risks for a deal.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            dealId: { type: Type.STRING, description: "Unique deal ID" },
          },
          required: ["dealId"],
        },
      },
      {
        name: "propose_create_task",
        description: "Propose creating a new follow-up sales task. This requires user confirmation.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Task title" },
            description: { type: Type.STRING, description: "Context details" },
            dueDate: { type: Type.STRING, description: "Due date in YYYY-MM-DD format" },
            contactId: { type: Type.STRING, description: "Optional contact ID to link" },
          },
          required: ["title", "dueDate"],
        },
      },
      {
        name: "propose_draft_email",
        description: "Propose drafting a follow-up email. This requires user confirmation.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            contactId: { type: Type.STRING, description: "Contact ID to draft for" },
            subject: { type: Type.STRING, description: "Email subject line" },
            body: { type: Type.STRING, description: "Email message body" },
          },
          required: ["contactId", "subject", "body"],
        },
      },
    ],
  },
];

export async function runCopilotToolLoop(
  userMessage: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  userSession: { id: string; role: "admin" | "manager" | "rep"; orgId: string }
) {
  const { orgId, id: userId, role } = userSession;
  const ownerIdFilter = ownerScope(role, userId);

  if (!ai) {
    return {
      text: "Gemini AI client is not initialized. I can only answer that Keel is in simulation mode.",
      proposals: [],
    };
  }

  const systemInstruction = `
    You are the Keel CRM AI Copilot. You assist sales reps, managers, and admins.
    Always query details using read-only tools (search_contacts, search_deals, get_deal_details, explain_deal_risk) to answer user questions.
    For mutations (propose_create_task, propose_draft_email), invoke the corresponding propose tool; do NOT execute directly.
    Respect the user's role: ${role} (ID: ${userId}) and Organization: ${orgId}.
    Keep responses concise and display findings in bullet points.
  `;

  // 1. Initial Gemini call
  let response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      ...history.map(h => ({
        role: h.role,
        parts: h.parts
      })),
      { role: "user", parts: [{ text: userMessage }] }
    ],
    config: {
      systemInstruction,
      tools: copilotTools as any,
    },
  });

  let functionCalls = response.functionCalls || [];
  const proposals: any[] = [];

  // 2. Loop to handle function calls
  while (functionCalls.length > 0) {
    const toolResults: any[] = [];

    for (const call of functionCalls) {
      const { name, args } = call;
      console.log(`Copilot calling tool: ${name} with args:`, args);

      // Read-Only Tool: Search Contacts
      if (name === "search_contacts") {
        const queryVal = `%${(args as any).query}%`;
        const conditions = [eq(contacts.orgId, orgId)];
        if (ownerIdFilter) conditions.push(eq(contacts.ownerId, ownerIdFilter));

        const matches = await db.query.contacts.findMany({
          where: and(
            ...conditions,
            or(
              like(contacts.firstName, queryVal),
              like(contacts.lastName, queryVal),
              like(contacts.phone, queryVal),
              like(contacts.email, queryVal)
            )
          ),
          limit: 5,
        });

        toolResults.push({
          response: { name: "search_contacts", output: { contacts: matches } },
        });
      }

      // Read-Only Tool: Search Deals
      else if (name === "search_deals") {
        const queryVal = `%${(args as any).query}%`;
        const conditions = [eq(deals.orgId, orgId)];
        if (ownerIdFilter) conditions.push(eq(deals.ownerId, ownerIdFilter));

        const matches = await db.query.deals.findMany({
          where: and(...conditions, like(deals.title, queryVal)),
          limit: 5,
        });

        toolResults.push({
          response: { name: "search_deals", output: { deals: matches } },
        });
      }

      // Read-Only Tool: Get Deal Details
      else if (name === "get_deal_details") {
        const dealId = (args as any).dealId;
        const conditions = [eq(deals.orgId, orgId), eq(deals.id, dealId)];
        if (ownerIdFilter) conditions.push(eq(deals.ownerId, ownerIdFilter));

        const dealMatch = await db.query.deals.findFirst({
          where: and(...conditions),
          with: {
            contact: true,
            company: true,
            stage: true,
          },
        });

        toolResults.push({
          response: { name: "get_deal_details", output: { deal: dealMatch || null } },
        });
      }

      // Read-Only Tool: Explain Deal Risk
      else if (name === "explain_deal_risk") {
        const dealId = (args as any).dealId;
        const conditions = [eq(deals.orgId, orgId), eq(deals.id, dealId)];
        if (ownerIdFilter) conditions.push(eq(deals.ownerId, ownerIdFilter));

        const dealMatch = await db.query.deals.findFirst({
          where: and(...conditions),
          with: {
            stage: true,
          },
        });

        const dealMatchAny = dealMatch as any;
        const risks = [];
        if (dealMatchAny) {
          if (dealMatchAny.stage?.type === "lost") risks.push("Deal is closed lost.");
          if (dealMatchAny.value > 1000000 && dealMatchAny.probability < 30) {
            risks.push("High value deal with low win probability.");
          }
          if (dealMatchAny.healthFlags?.includes("stale_deal")) {
            risks.push("Stale deal: No timeline activity in the last 14 days.");
          }
        }

        toolResults.push({
          response: {
            name: "explain_deal_risk",
            output: {
              risks: risks.length > 0 ? risks : ["No high-priority risks detected for this deal."],
            },
          },
        });
      }

      // Mutating Tool: Propose Task
      else if (name === "propose_create_task") {
        proposals.push({
          type: "create_task",
          args: args,
        });

        toolResults.push({
          response: {
            name: "propose_create_task",
            output: { status: "proposed", message: "Task proposed to user. Waiting for approval." },
          },
        });
      }

      // Mutating Tool: Propose Email
      else if (name === "propose_draft_email") {
        proposals.push({
          type: "draft_email",
          args: args,
        });

        toolResults.push({
          response: {
            name: "propose_draft_email",
            output: { status: "proposed", message: "Draft proposed to user. Waiting for approval." },
          },
        });
      }
    }

    // Call Gemini again with the tool output values
    const nextResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: "user", parts: [{ text: userMessage }] },
        { role: "model", parts: response.candidates?.[0]?.content?.parts || [] },
        { role: "user", parts: toolResults.map(tr => tr.response) as any },
      ],
      config: {
        systemInstruction,
        tools: copilotTools as any,
      },
    });

    response = nextResponse;
    functionCalls = response.functionCalls || [];
  }

  return {
    text: response.text || "I have processed your request.",
    proposals,
  };
}
