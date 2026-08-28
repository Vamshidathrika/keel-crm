import { NextResponse } from "next/server";

export async function GET() {
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Keel Platform API",
      version: "1.0.0",
      description: "Developer & Partner REST API for Keel Autonomous Agentic CRM. Manage contacts, deals, companies, activities, tasks, notes, pipelines, clients, quotations, invoices, payments, revenue, projects, followups, agent runs & actions, vertical modules (shipments, KYC, appointments, orders, properties), webhooks, and invoke autonomous AI agents programmatically.",
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
          responses: { "200": { description: "List of contacts" }, "401": { description: "Unauthorized" } },
        },
        post: {
          summary: "Create a new contact (Triggers Prospector Agent & Auto-Provisions Company)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["firstName"],
                  properties: {
                    firstName: { type: "string", description: "First name (Required)" },
                    lastName: { type: "string", description: "Last name (Optional)" },
                    email: { type: "string", description: "Email address (Optional)" },
                    phone: { type: "string", description: "Phone number (Optional)" },
                    whatsapp: { type: "string", description: "WhatsApp number for instant messaging (Optional)" },
                    title: { type: "string", description: "Job title / Designation (Optional)" },
                    department: { type: "string", description: "Department (e.g. Sales, Procurement) (Optional)" },
                    seniorityLevel: { type: "string", enum: ["c_level", "vp", "director", "manager", "staff", "other"], description: "Seniority tier (Optional)" },
                    buyingRole: { type: "string", enum: ["decision_maker", "champion", "economic_buyer", "influencer", "blocker", "end_user", "evaluator"], description: "MEDDPICC buying role (Optional)" },
                    preferredChannel: { type: "string", enum: ["email", "whatsapp", "phone", "sms"], default: "email", description: "Preferred channel (Optional)" },
                    linkedinUrl: { type: "string", description: "LinkedIn profile URL (Optional)" },
                    timezone: { type: "string", description: "Timezone e.g. Asia/Kolkata (Optional)" },
                    city: { type: "string", description: "City (Optional)" },
                    state: { type: "string", description: "State / Province (Optional)" },
                    country: { type: "string", description: "Country (Optional)" },
                    postalCode: { type: "string", description: "Postal / ZIP code (Optional)" },
                    companyId: { type: "string", description: "Existing Company ID or Auto-provision name (Optional)" },
                    companyName: { type: "string", description: "Company name to auto-create & link (Optional)" },
                    tags: { type: "array", items: { type: "string" }, description: "Tags e.g. ['enterprise', 'lead'] (Optional)" },
                    customFields: { type: "object", description: "Dynamic JSON key-value attributes (Optional)" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Contact created successfully" } },
        },
      },
      "/contacts/batch": {
        post: {
          summary: "Batch ingest up to 100 contacts with duplicate email deduplication",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["firstName"],
                    properties: {
                      firstName: { type: "string" },
                      lastName: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      whatsapp: { type: "string" },
                      title: { type: "string" },
                      companyName: { type: "string" },
                      tags: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Batch creation summary with created, skipped, and error arrays" } },
        },
      },
      "/deals": {
        get: {
          summary: "List pipeline deals",
          parameters: [
            { name: "pipelineId", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          ],
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
                    pipelineId: { type: "string" },
                    stageId: { type: "string" },
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
        get: {
          summary: "List or search company accounts",
          parameters: [
            { name: "query", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          ],
          responses: { "200": { description: "List of companies" } },
        },
        post: {
          summary: "Create a company account (Triggers Prospector Agent)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", description: "Company name (Required)" },
                    domain: { type: "string", description: "Domain name e.g. reliance.com (Optional)" },
                    industry: { type: "string", description: "Industry vertical (Optional)" },
                    website: { type: "string", description: "Website URL (Optional)" },
                    linkedinUrl: { type: "string", description: "LinkedIn company page (Optional)" },
                    gstin: { type: "string", description: "GSTIN / VAT / Tax ID (Optional)" },
                    employeeCount: { type: "string", description: "Employee range e.g. '51-200' (Optional)" },
                    annualRevenue: { type: "number", description: "Annual revenue in base currency (Optional)" },
                    address: { type: "string", description: "Street address (Optional)" },
                    city: { type: "string", description: "City (Optional)" },
                    state: { type: "string", description: "State / Province (Optional)" },
                    country: { type: "string", description: "Country (Optional)" },
                    postalCode: { type: "string", description: "Postal code (Optional)" },
                    tags: { type: "array", items: { type: "string" } },
                    customFields: { type: "object" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Company created successfully" } },
        },
      },
      "/activities": {
        get: {
          summary: "List timeline activities",
          parameters: [
            { name: "contactId", in: "query", schema: { type: "string" } },
            { name: "dealId", in: "query", schema: { type: "string" } },
            { name: "type", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "List of activities" } },
        },
        post: {
          summary: "Ingest call recording, transcript, or activity event",
          responses: { "200": { description: "Activity logged and AI scheduled" } },
        },
      },
      "/tasks": {
        get: { summary: "List tasks", responses: { "200": { description: "List of tasks" } } },
        post: { summary: "Create task", responses: { "201": { description: "Task created" } } },
      },
      "/notes": {
        get: { summary: "List notes", responses: { "200": { description: "List of notes" } } },
        post: { summary: "Create note", responses: { "201": { description: "Note created" } } },
      },
      "/pipelines": {
        get: { summary: "List pipelines and stages", responses: { "200": { description: "Pipelines" } } },
        post: { summary: "Create pipeline with stages", responses: { "201": { description: "Pipeline created" } } },
      },
      "/clients": {
        get: { summary: "List clients", responses: { "200": { description: "List of clients" } } },
        post: { summary: "Create client", responses: { "201": { description: "Client created" } } },
      },
      "/quotations": {
        get: { summary: "List quotations", responses: { "200": { description: "Quotations" } } },
        post: { summary: "Create quotation", responses: { "201": { description: "Quotation created" } } },
      },
      "/invoices": {
        get: { summary: "List invoices", responses: { "200": { description: "Invoices" } } },
        post: { summary: "Create invoice", responses: { "201": { description: "Invoice created" } } },
      },
      "/payments": {
        get: { summary: "List payments", responses: { "200": { description: "Payments" } } },
        post: { summary: "Record payment", responses: { "201": { description: "Payment recorded" } } },
      },
      "/revenue": {
        get: { summary: "Get aggregated pipeline and revenue metrics", responses: { "200": { description: "Revenue Metrics" } } },
      },
      "/projects": {
        get: { summary: "List delivery projects", responses: { "200": { description: "Projects" } } },
        post: { summary: "Create project", responses: { "201": { description: "Project created" } } },
      },
      "/followups": {
        get: { summary: "List follow-ups", responses: { "200": { description: "Follow-ups" } } },
        post: { summary: "Schedule follow-up", responses: { "201": { description: "Follow-up scheduled" } } },
      },
      "/agents/invoke": {
        post: {
          summary: "Programmatically invoke an Autonomous Specialist Agent",
          responses: { "200": { description: "Agent execution summary, chain-of-thought, and tool results" } },
        },
      },
      "/agents/runs": {
        get: { summary: "List agent execution audit logs", responses: { "200": { description: "Agent Runs" } } },
      },
      "/agents/actions": {
        get: { summary: "List human-in-the-loop action queue items", responses: { "200": { description: "Action items" } } },
        post: { summary: "Approve or reject proposed agent action", responses: { "200": { description: "Action processed" } } },
      },
      "/agents/memories": {
        get: { summary: "Retrieve agent long-term memory key-values", responses: { "200": { description: "Memories" } } },
        post: { summary: "Upsert agent long-term memory", responses: { "201": { description: "Memory stored" } } },
      },
      "/agents/configs": {
        get: { summary: "Get autonomous agent configurations", responses: { "200": { description: "Agent Configs" } } },
        post: { summary: "Update autonomous agent configuration", responses: { "200": { description: "Config updated" } } },
      },
      "/shipments": {
        get: { summary: "List logistics shipments", responses: { "200": { description: "Shipments" } } },
        post: { summary: "Create shipment", responses: { "201": { description: "Shipment created" } } },
      },
      "/kyc": {
        get: { summary: "List KYC verification records", responses: { "200": { description: "KYC records" } } },
        post: { summary: "Submit KYC record", responses: { "201": { description: "KYC submitted" } } },
      },
      "/appointments": {
        get: { summary: "List appointments", responses: { "200": { description: "Appointments" } } },
        post: { summary: "Book appointment", responses: { "201": { description: "Appointment booked" } } },
      },
      "/orders": {
        get: { summary: "List orders", responses: { "200": { description: "Orders" } } },
        post: { summary: "Create order", responses: { "201": { description: "Order created" } } },
      },
      "/properties": {
        get: { summary: "List real estate properties", responses: { "200": { description: "Properties" } } },
        post: { summary: "List property", responses: { "201": { description: "Property created" } } },
      },
      "/webhooks": {
        get: { summary: "List registered outbound webhooks", responses: { "200": { description: "Webhooks" } } },
        post: { summary: "Register outbound webhook", responses: { "201": { description: "Webhook registered" } } },
      },
      "/webhooks/payment": {
        post: { summary: "Inbound payment webhook (transitions deal to won)", responses: { "200": { description: "Payment processed" } } },
      },
      "/automations": {
        get: { summary: "List workflow automations", responses: { "200": { description: "Automations" } } },
        post: { summary: "Create automation rule", responses: { "201": { description: "Automation created" } } },
      },
      "/custom-fields": {
        get: { summary: "List custom field definitions", responses: { "200": { description: "Custom fields" } } },
        post: { summary: "Define custom field", responses: { "201": { description: "Custom field defined" } } },
      },
      "/tags": {
        get: { summary: "List tags", responses: { "200": { description: "Tags" } } },
        post: { summary: "Create tag", responses: { "201": { description: "Tag created" } } },
      },
      "/notifications": {
        get: { summary: "List notifications", responses: { "200": { description: "Notifications" } } },
        post: { summary: "Create notification", responses: { "201": { description: "Notification created" } } },
      },
      "/audit-logs": {
        get: { summary: "Query security and mutation audit logs", responses: { "200": { description: "Audit logs" } } },
      },
      "/team": {
        get: { summary: "List organization team members", responses: { "200": { description: "Team members" } } },
        post: { summary: "Add/invite team member", responses: { "201": { description: "Member created" } } },
      },
      "/search": {
        get: { summary: "Global search across contacts, deals, companies, and tasks", responses: { "200": { description: "Search results" } } },
      },
      "/duplicates": {
        get: { summary: "Scan and detect duplicate records", responses: { "200": { description: "Duplicate clusters" } } },
        post: { summary: "Merge duplicate contacts", responses: { "200": { description: "Merge completed" } } },
      },
      "/apikeys": {
        get: { summary: "List active API keys", responses: { "200": { description: "API keys" } } },
        post: { summary: "Generate new scoped API key", responses: { "201": { description: "API key generated" } } },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
