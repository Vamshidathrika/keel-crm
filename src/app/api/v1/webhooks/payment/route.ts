import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, stages, pipelines, invoices, activities, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";
import { authenticateApiKey } from "@/lib/api/auth";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const secretHeader = req.headers.get("x-webhook-secret");
    const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

    let authenticatedOrgId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const authResult = await authenticateApiKey(req);
      if (!authResult.authorized) {
        return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
      }
      authenticatedOrgId = authResult.orgId || null;
    } else if (configuredSecret && secretHeader === configuredSecret) {
      // Validated via shared secret
    } else if (configuredSecret && secretHeader !== configuredSecret) {
      return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
    } else if (!authHeader && !secretHeader) {
      // In development / testing, fallback to requiring Bearer API key
      const authResult = await authenticateApiKey(req);
      if (!authResult.authorized) {
        return NextResponse.json({ error: "Authentication required via Bearer API key or x-webhook-secret header." }, { status: 401 });
      }
      authenticatedOrgId = authResult.orgId || null;
    }

    const body = await req.json();
    const {
      orgId = authenticatedOrgId,
      dealId,
      customerEmail,
      amount,
      currency = "INR",
      paymentId,
      sendClientKickoff = true,
    } = body;

    const targetOrgId = authenticatedOrgId || orgId;

    if (!targetOrgId) {
      return NextResponse.json({ error: "Field 'orgId' is required." }, { status: 400 });
    }

    let targetDeal: any = null;

    if (dealId) {
      targetDeal = await db.query.deals.findFirst({
        where: and(eq(deals.id, dealId), eq(deals.orgId, orgId)),
        with: { contact: true, company: true, stage: true },
      });
    }

    if (!targetDeal && customerEmail) {
      const contact = await db.query.contacts.findFirst({
        where: and(eq(contacts.orgId, orgId), eq(contacts.email, customerEmail)),
      });
      if (contact) {
        targetDeal = await db.query.deals.findFirst({
          where: and(eq(deals.orgId, orgId), eq(deals.contactId, contact.id)),
          with: { contact: true, company: true, stage: true },
        });
      }
    }

    if (!targetDeal) {
      return NextResponse.json(
        { error: "Could not locate matching deal for payment record." },
        { status: 404 }
      );
    }

    // 1. Find the Closed Won stage for this pipeline
    const wonStage = await db.query.stages.findFirst({
      where: and(eq(stages.pipelineId, targetDeal.pipelineId), eq(stages.type, "won")),
    });

    const targetStageId = wonStage ? wonStage.id : targetDeal.stageId;

    // 2. Transition Deal to Closed Won / Work Started
    await db
      .update(deals)
      .set({
        stageId: targetStageId,
        probability: 100,
        healthFlags: [],
      })
      .where(eq(deals.id, targetDeal.id));

    // 3. Log Activity Timeline
    const paidAmountFormatted = `${currency} ${(amount || targetDeal.value).toLocaleString()}`;
    await db.insert(activities).values({
      orgId,
      type: "note",
      relatedDealId: targetDeal.id,
      relatedContactId: targetDeal.contactId || null,
      body: `🎉 Payment Confirmed (${paidAmountFormatted})! Deal moved to Closed Won / Work Started. (Ref: ${paymentId || "Direct"})`,
      source: "ai",
    });

    // 4. Draft & Log Client Kickoff Message
    const clientMessage = `Hi ${targetDeal.contact?.firstName || "there"},\n\nWe have received your confirmation and payment of ${paidAmountFormatted}. Your project kickoff has commenced. Our team is setting up your onboarding workspace now!\n\nBest regards,\nKeel Operations Team`;

    if (sendClientKickoff) {
      await db.insert(activities).values({
        orgId,
        type: "email",
        relatedDealId: targetDeal.id,
        relatedContactId: targetDeal.contactId || null,
        body: `[Dispatched to Client]:\n${clientMessage}`,
        source: "ai",
      });
    }

    // 5. Dispatch Event to Connected Apps (Slack, Jira, Zapier, Webhooks)
    const webhookResult = await dispatchWebhookEvent(orgId, "deal.won", {
      dealId: targetDeal.id,
      dealTitle: targetDeal.title,
      value: targetDeal.value,
      currency,
      contact: {
        name: targetDeal.contact ? `${targetDeal.contact.firstName} ${targetDeal.contact.lastName || ""}`.trim() : null,
        email: targetDeal.contact?.email || customerEmail,
        phone: targetDeal.contact?.phone,
      },
      company: targetDeal.company?.name || null,
      paymentId: paymentId || null,
      status: "work_started",
      clientMessageDispatched: sendClientKickoff,
    });

    return NextResponse.json({
      status: "success",
      summary: `Payment processed. Deal #${targetDeal.id} transitioned to Won. Connected apps notified (${webhookResult.deliveredCount} dispatched).`,
      dealId: targetDeal.id,
      stageUpdated: true,
      clientMessage,
      webhooksDelivered: webhookResult.deliveredCount,
    });
  } catch (err: any) {
    console.error("Payment webhook error:", err);
    return NextResponse.json({ error: err.message || "Failed to process payment webhook" }, { status: 500 });
  }
}
