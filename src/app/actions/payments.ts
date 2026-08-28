"use server";

import { db } from "@/db";
import { payments, invoices, activities, organizations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { dispatchWebhookEvent } from "@/lib/webhooks-dispatcher";
import { triggerWorkflows } from "@/app/actions/automations";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type PaymentMode = "upi" | "bank_transfer" | "neft_rtgs" | "cash" | "cheque" | "credit_card" | "gateway";

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  paidAt?: string;
}

/**
 * Record a payment against an invoice (supports Full & Partial payments)
 */
export async function recordInvoicePayment(input: RecordPaymentInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;
  const paymentAmount = Number(input.amount);

  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  // 1. Fetch Invoice
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, input.invoiceId), eq(invoices.orgId, orgId)),
    with: {
      client: true,
      deal: true,
    },
  });

  if (!invoice) throw new Error("Invoice not found.");

  const currentPaid = invoice.paidAmount || 0;
  const remainingBalance = Math.max(0, invoice.amount - currentPaid);

  const result = await db.transaction(async (tx) => {
    // 2. Insert Payment Record
    const [payment] = await tx
      .insert(payments)
      .values({
        orgId,
        invoiceId: invoice.id,
        amount: paymentAmount,
        paymentMode: input.paymentMode,
        referenceNumber: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        status: "completed",
        paidAt: input.paidAt || new Date().toISOString(),
      })
      .returning();

    // 3. Update Invoice Paid Amount and Status
    const newPaidAmount = currentPaid + paymentAmount;
    let newStatus: "draft" | "unpaid" | "partially_paid" | "paid" | "overdue" = "unpaid";

    if (newPaidAmount >= invoice.amount) {
      newStatus = "paid";
    } else if (newPaidAmount > 0) {
      newStatus = "partially_paid";
    }

    const [updatedInvoice] = await tx
      .update(invoices)
      .set({
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: newStatus === "paid" ? (input.paidAt || new Date().toISOString()) : invoice.paidAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(invoices.id, invoice.id))
      .returning();

    return { payment, updatedInvoice };
  });

  // 4. Log Activity
  await db.insert(activities).values({
    orgId,
    type: "system",
    body: `Recorded payment of ₹${paymentAmount.toLocaleString("en-IN")} (${input.paymentMode.toUpperCase()}) for Invoice ${invoice.invoiceNumber}. Ref: ${input.referenceNumber || "N/A"}. New Status: ${result.updatedInvoice.status.toUpperCase()}.`,
    relatedDealId: invoice.dealId || null,
    source: "manual",
  });

  await logAuditEntry(orgId, userId, "create", "payment", result.payment.id, {
    invoiceId: invoice.id,
    amount: paymentAmount,
    mode: input.paymentMode,
    newStatus: result.updatedInvoice.status,
  });

  // 5. Dispatch Webhook Event
  dispatchWebhookEvent(orgId, "payment.succeeded" as any, {
    paymentId: result.payment.id,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    amount: paymentAmount,
    paymentMode: input.paymentMode,
    referenceNumber: input.referenceNumber,
    newInvoiceStatus: result.updatedInvoice.status,
  }).catch((e) => console.error("Payment webhook error:", e));

  // 6. Trigger Background Workflow Automation
  if (result.updatedInvoice.status === "paid") {
    triggerWorkflows(orgId, "invoice_paid", invoice.id, {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      clientId: invoice.clientId,
      dealId: invoice.dealId,
    }).catch((e) => console.error("Workflow trigger error:", e));
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoice.id}`);
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/business-os");

  return result;
}

/**
 * Get all payments for a specific invoice
 */
export async function getInvoicePayments(invoiceId: string) {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.payments.findMany({
    where: and(eq(payments.invoiceId, invoiceId), eq(payments.orgId, session.user.orgId)),
    orderBy: [desc(payments.paidAt)],
  });
}

/**
 * Get organization payment ledger
 */
export async function getOrgPayments() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.payments.findMany({
    where: eq(payments.orgId, session.user.orgId),
    with: {
      invoice: true,
    },
    orderBy: [desc(payments.paidAt)],
    limit: 50,
  });
}
