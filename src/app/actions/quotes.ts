"use server";

import { db } from "@/db";
import { quotations, clients, activities, deals } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getQuotes() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.quotations.findMany({
    where: eq(quotations.orgId, session.user.orgId),
    with: { client: true, deal: true },
    orderBy: [desc(quotations.createdAt)],
  });
}

export async function createQuote(data: {
  title: string;
  clientName: string;
  amount: number;
  items?: Array<{ name: string; qty: number; price: number }>;
  dealId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  let client = await db.query.clients.findFirst({
    where: and(eq(clients.orgId, orgId), eq(clients.name, data.clientName.trim())),
  });

  if (!client) {
    const [newClient] = await db
      .insert(clients)
      .values({
        orgId,
        name: data.clientName.trim(),
        portalToken: `pt_${crypto.randomUUID()}`,
      })
      .returning();
    client = newClient;
  }

  const items = data.items || [{ name: data.title, qty: 1, price: data.amount }];

  const [quote] = await db
    .insert(quotations)
    .values({
      orgId,
      clientId: client.id,
      dealId: data.dealId || null,
      title: data.title.trim(),
      items,
      total: data.amount,
      status: "draft",
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "note",
    body: `Generated CPQ Quotation "${quote.title}" (#${quote.id}) for ₹${quote.total.toLocaleString()}`,
    source: "manual",
  });

  revalidatePath("/dashboard/quotes");
  return quote;
}

export async function updateQuoteStatus(id: string, status: "draft" | "sent" | "accepted" | "rejected") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [updated] = await db
    .update(quotations)
    .set({ status })
    .where(and(eq(quotations.id, id), eq(quotations.orgId, session.user.orgId)))
    .returning();

  revalidatePath("/dashboard/quotes");
  return updated;
}

export async function convertQuoteToInvoice(quoteId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  // 1. Fetch Quote
  const quote = await db.query.quotations.findFirst({
    where: and(eq(quotations.id, quoteId), eq(quotations.orgId, orgId)),
    with: { client: true, deal: true },
  });

  if (!quote) throw new Error("Quotation not found");

  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const subtotal = quote.subtotal || quote.total;
  const taxPercent = quote.taxPercent || 18;
  const taxAmount = Math.round((subtotal * taxPercent) / 100);

  // 2. Insert Invoice
  const { invoices } = await import("@/db/schema");
  const [inv] = await db
    .insert(invoices)
    .values({
      orgId,
      clientId: quote.clientId,
      dealId: quote.dealId || null,
      invoiceNumber,
      amount: quote.total,
      subtotal,
      taxAmount,
      paymentTerms: "net_30",
      lineItems: (quote.items as any) || [],
      dueDate,
      status: "unpaid",
    })
    .returning();

  // 3. Mark Quote as Accepted
  await db
    .update(quotations)
    .set({ status: "accepted", updatedAt: new Date().toISOString() })
    .where(and(eq(quotations.id, quoteId), eq(quotations.orgId, orgId)));

  // 4. Log Activity
  await db.insert(activities).values({
    orgId,
    type: "system",
    relatedDealId: quote.dealId || null,
    body: `Quotation "${quote.title}" converted to Invoice ${inv.invoiceNumber} (₹${inv.amount.toLocaleString("en-IN")})`,
    source: "manual",
  });

  // 5. Dispatch Webhook & Trigger Workflows
  const { dispatchWebhookEvent } = await import("@/lib/webhooks-dispatcher");
  dispatchWebhookEvent(orgId, "invoice.issued", {
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    quoteId: quote.id,
    clientId: inv.clientId,
    amount: inv.amount,
    status: inv.status,
    dueDate: inv.dueDate,
  }).catch((err) => console.error("Webhook error:", err));

  const { triggerWorkflows } = await import("@/app/actions/automations");
  triggerWorkflows(orgId, "quote_accepted", quote.id, {
    quoteTotal: quote.total,
    clientId: quote.clientId,
    dealId: quote.dealId,
  }).catch((err) => console.error("Workflow trigger error:", err));

  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/business-os");
  return inv;
}
