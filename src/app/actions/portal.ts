"use server";

import { db } from "@/db";
import { deliverables, clients, activities, messageRecords, quotations, invoices, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { dispatchWebhookEvent } from "@/lib/webhooks-dispatcher";

export async function updateDeliverableStatus(
  portalToken: string,
  deliverableId: string,
  status: "approved" | "changes_requested",
  clientFeedback?: string
) {
  // 1. Verify portal token
  const client = await db.query.clients.findFirst({
    where: eq(clients.portalToken, portalToken),
  });

  if (!client) throw new Error("Invalid portal token");

  // 2. Verify deliverable belongs to a project of this client
  const deliv = await db.query.deliverables.findFirst({
    where: eq(deliverables.id, deliverableId),
    with: {
      project: true,
    },
  });

  if (!deliv || deliv.project?.clientId !== client.id || deliv.project?.orgId !== client.orgId) {
    throw new Error("Deliverable not found for this client");
  }

  // 3. Update Deliverable Status
  const [updated] = await db
    .update(deliverables)
    .set({
      status,
      clientFeedback: clientFeedback || null,
    })
    .where(eq(deliverables.id, deliverableId))
    .returning();

  // 3. Log Activity on CRM Timeline
  await db.insert(activities).values({
    orgId: client.orgId,
    type: "system",
    body: `Client "${client.name}" ${status === "approved" ? "APPROVED" : "REQUESTED CHANGES ON"} deliverable "${updated.title}" via Client Portal.`,
    source: "system",
  });

  dispatchWebhookEvent(
    client.orgId,
    status === "approved" ? "deliverable.approved" : "deliverable.changes_requested",
    {
      deliverableId: updated.id,
      projectId: updated.projectId,
      title: updated.title,
      status: updated.status,
    }
  ).catch((err) => console.error("Webhook dispatch error:", err));

  revalidatePath(`/portal/${portalToken}`);
  return updated;
}

export async function acceptQuoteByPortal(
  portalToken: string,
  quoteId: string,
  signerName: string
) {
  const client = await db.query.clients.findFirst({
    where: eq(clients.portalToken, portalToken),
  });

  if (!client) throw new Error("Invalid portal token");

  const [updated] = await db
    .update(quotations)
    .set({
      status: "accepted",
      signedAt: new Date().toISOString(),
      signerName: signerName.trim() || client.name,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(quotations.id, quoteId), eq(quotations.clientId, client.id)))
    .returning();

  if (updated) {
    await db.insert(activities).values({
      orgId: client.orgId,
      type: "system",
      relatedDealId: updated.dealId || null,
      body: `Client "${client.name}" officially ACCEPTED quote "${updated.title}" (#${updated.id}) via Client Portal. Signed by: ${updated.signerName}`,
      source: "system",
    });

    dispatchWebhookEvent(client.orgId, "quote.accepted", {
      quoteId: updated.id,
      title: updated.title,
      clientId: updated.clientId,
      dealId: updated.dealId,
      total: updated.total,
      signedAt: updated.signedAt,
      signerName: updated.signerName,
    }).catch((err) => console.error("Webhook dispatch error:", err));
  }

  revalidatePath(`/portal/${portalToken}`);
  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/business-os");
  return updated;
}

export async function payInvoiceByPortal(
  portalToken: string,
  invoiceId: string,
  paymentDetails?: {
    paymentMode?: "upi" | "bank_transfer" | "credit_card" | "gateway";
    referenceNumber?: string;
    notes?: string;
  }
) {
  const client = await db.query.clients.findFirst({
    where: eq(clients.portalToken, portalToken),
  });

  if (!client) throw new Error("Invalid portal token");

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.clientId, client.id)),
  });

  if (!invoice) throw new Error("Invoice not found for this client");

  const mode = paymentDetails?.paymentMode || "upi";

  const [payment] = await db
    .insert(payments)
    .values({
      orgId: client.orgId,
      invoiceId: invoice.id,
      amount: invoice.amount,
      paymentMode: mode,
      referenceNumber: paymentDetails?.referenceNumber || `PORTAL-PAY-${Date.now().toString(36).toUpperCase()}`,
      notes: paymentDetails?.notes || "Settled by client directly via Client Portal",
      status: "completed",
      paidAt: new Date().toISOString(),
    })
    .returning();

  const [updated] = await db
    .update(invoices)
    .set({
      paidAmount: invoice.amount,
      status: "paid",
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.clientId, client.id)))
    .returning();

  if (updated) {
    await db.insert(activities).values({
      orgId: client.orgId,
      type: "system",
      relatedDealId: updated.dealId || null,
      body: `Client "${client.name}" settled payment of ₹${updated.amount.toLocaleString("en-IN")} (${mode.toUpperCase()}) for Invoice ${updated.invoiceNumber} via Client Portal. Ref: ${payment.referenceNumber}.`,
      source: "system",
    });

    dispatchWebhookEvent(client.orgId, "invoice.paid", {
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      clientId: updated.clientId,
      dealId: updated.dealId,
      amount: updated.amount,
      paidAt: updated.paidAt,
      paymentId: payment.id,
      paymentMode: mode,
      referenceNumber: payment.referenceNumber,
    }).catch((err) => console.error("Webhook dispatch error:", err));
  }

  revalidatePath(`/portal/${portalToken}`);
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/business-os");
  return { updatedInvoice: updated, payment };
}
