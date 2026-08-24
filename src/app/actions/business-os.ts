"use server";

import { db } from "@/db";
import { clients, projects, deals, quotations, invoices, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function convertDealToClientProject(data: {
  dealId: string;
  clientName: string;
  budget?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;
  const portalToken = `pt_${crypto.randomUUID()}`;

  // 1. Create real Client record with Portal Token
  const [newClient] = await db
    .insert(clients)
    .values({
      orgId,
      name: data.clientName.trim(),
      portalToken,
      email: "procurement@client.com",
    })
    .returning();

  // 2. Create real Project record
  const [newProject] = await db
    .insert(projects)
    .values({
      orgId,
      clientId: newClient.id,
      dealId: data.dealId,
      name: `${data.clientName} Delivery & Implementation`,
      status: "active",
      budget: data.budget || 0,
    })
    .returning();

  // 3. Move Deal to Won
  await db
    .update(deals)
    .set({
      probability: 100,
      contactId: newClient.contactId || undefined,
    })
    .where(and(eq(deals.id, data.dealId), eq(deals.orgId, orgId)));

  // 4. Log System Timeline Activity
  await db.insert(activities).values({
    orgId,
    type: "system",
    relatedDealId: data.dealId,
    body: `Deal converted to Active Project "${newProject.name}". Client Portal provisioned (Token: ${portalToken}).`,
    source: "system",
  });

  revalidatePath("/dashboard/business-os");
  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/projects");

  return { client: newClient, project: newProject };
}

export async function createBusinessOsProposal(data: {
  dealId?: string;
  clientId: string;
  title: string;
  items: Array<{ name: string; qty: number; price: number }>;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;
  const total = data.items.reduce((sum, item) => sum + item.qty * item.price, 0);

  const [quote] = await db
    .insert(quotations)
    .values({
      orgId,
      clientId: data.clientId,
      dealId: data.dealId || null,
      title: data.title.trim(),
      items: data.items,
      total,
      status: "sent",
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "note",
    relatedDealId: data.dealId || null,
    body: `Published CPQ Proposal "${quote.title}" (#${quote.id}) for ₹${total.toLocaleString("en-IN")}`,
    source: "manual",
  });

  revalidatePath("/dashboard/business-os");
  revalidatePath("/dashboard/quotes");
  return quote;
}

export async function createBusinessOsInvoice(data: {
  dealId?: string;
  clientId: string;
  amount: number;
  dueDate?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  const dueDate = data.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const [inv] = await db
    .insert(invoices)
    .values({
      orgId,
      clientId: data.clientId,
      dealId: data.dealId || null,
      invoiceNumber,
      amount: data.amount,
      status: "unpaid",
      dueDate,
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "system",
    relatedDealId: data.dealId || null,
    body: `Issued Invoice ${inv.invoiceNumber} for ₹${data.amount.toLocaleString("en-IN")}`,
    source: "manual",
  });

  revalidatePath("/dashboard/business-os");
  return inv;
}
