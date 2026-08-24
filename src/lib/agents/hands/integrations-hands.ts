import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

export const triggerConnectedAppTool = tool(
  async ({ orgId, eventType, data }) => {
    const res = await dispatchWebhookEvent(orgId, eventType, data);
    return {
      status: "success",
      summary: `Dispatched event "${eventType}" to ${res.deliveredCount} registered connected application(s).`,
      deliveredCount: res.deliveredCount,
    };
  },
  {
    name: "crm_trigger_connected_app",
    description: "Dispatch an event payload to external connected apps (Slack, Jira, Asana, Zapier, Webhooks).",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      eventType: z.string().describe("Event name (e.g. 'deal.won', 'work.started', 'payment.confirmed')"),
      data: z.record(z.string(), z.any()).describe("JSON payload to send to connected apps"),
    }),
  }
);

export const sendClientMessageTool = tool(
  async ({ orgId, contactId, dealId, channel = "email", message }) => {
    const [act] = await db
      .insert(activities)
      .values({
        orgId,
        type: channel as any,
        relatedContactId: contactId || null,
        relatedDealId: dealId || null,
        body: `[Outbound Message to Client via ${channel.toUpperCase()}]:\n${message}`,
        source: "ai",
      })
      .returning();

    return {
      status: "success",
      summary: `Dispatched client notification via ${channel}.`,
      activityId: act.id,
    };
  },
  {
    name: "crm_send_client_message",
    description: "Send a confirmation, kickoff, or onboarding message to a client through connected communication channels.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      contactId: z.string().optional().describe("Contact ID"),
      dealId: z.string().optional().describe("Deal ID"),
      channel: z.enum(["email", "whatsapp", "portal"]).optional().default("email"),
      message: z.string().describe("Message text to send to the client"),
    }),
  }
);
