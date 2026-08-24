import { NextResponse } from "next/server";

export async function GET() {
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Keel Platform API",
      version: "1.0.0",
      description: "Developer & Partner REST API for Keel Autonomous Agentic CRM. Manage contacts, deals, companies, activities, and invoke autonomous AI agents programmatically.",
    },
    servers: [
      {
        url: "/api/v1",
        description: "Production Platform API",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "keel_sk_...",
          description: "Generate scoped API keys in Settings > API Keys.",
        },
      },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      "/contacts": {
        get: {
          summary: "List or search contacts",
          parameters: [
            { name: "query", in: "query", schema: { type: "string" }, description: "Filter by name, email, or phone" },
            { name: "limit", in: "query", schema: { type: "integer", default: 25 }, description: "Max results" },
          ],
          responses: {
            "200": { description: "List of contacts" },
            "401": { description: "Unauthorized" },
          },
        },
        post: {
          summary: "Create a new contact (Triggers Prospector Agent)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["firstName"],
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    title: { type: "string" },
                    companyId: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Contact created successfully" },
          },
        },
      },
      "/deals": {
        get: {
          summary: "List pipeline deals",
          responses: { "200": { description: "List of deals" } },
        },
        post: {
          summary: "Create a new opportunity (Triggers Deal Doctor Agent)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "value"],
                  properties: {
                    title: { type: "string" },
                    value: { type: "number" },
                    currency: { type: "string", default: "INR" },
                    expectedCloseDate: { type: "string" },
                    contactId: { type: "string" },
                    companyId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Deal created successfully" } },
        },
      },
      "/companies": {
        get: { summary: "List or search company accounts" },
        post: { summary: "Create a company account (Triggers Prospector Agent)" },
      },
      "/agents/invoke": {
        post: {
          summary: "Programmatically invoke an Autonomous Specialist Agent",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["prompt"],
                  properties: {
                    agentType: { type: "string", enum: ["prospector", "deal_doctor", "guardian", "copilot"], default: "copilot" },
                    prompt: { type: "string", description: "Instructions or question for the agent" },
                    executionMode: { type: "string", enum: ["supervised", "full_auto"], default: "supervised" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Agent execution summary, chain-of-thought, and tool results" },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
