"use server";

import { db } from "@/db";
import { clients, projects, deals, quotations, invoices, activities, contacts } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { dispatchWebhookEvent } from "@/lib/webhooks-dispatcher";

export async function resolveOrCreateClient(
  orgId: string,
  input: { clientId?: string; contactId?: string; dealId?: string; clientName?: string }
) {
  // 1. Check if direct valid clientId exists
  if (input.clientId && input.clientId.startsWith("cli_")) {
    const found = await db.query.clients.findFirst({
      where: and(eq(clients.orgId, orgId), eq(clients.id, input.clientId)),
    });
    if (found) return found;
  }

  // 2. Check if contactId provided or passed as clientId
  const contactId = input.contactId || (input.clientId?.startsWith("con_") ? input.clientId : null);
  if (contactId) {
    const existingByContact = await db.query.clients.findFirst({
      where: and(eq(clients.orgId, orgId), eq(clients.contactId, contactId)),
    });
    if (existingByContact) return existingByContact;

    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.orgId, orgId), eq(contacts.id, contactId)),
    });
    if (contact) {
      const [newClient] = await db
        .insert(clients)
        .values({
          orgId,
          contactId: contact.id,
          companyId: contact.companyId || null,
          name: `${contact.firstName} ${contact.lastName || ""}`.trim() || contact.email || "Valued Client",
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          portalToken: `pt_${crypto.randomUUID()}`,
        })
        .returning();
      return newClient;
    }
  }

  // 3. Check if dealId provided
  if (input.dealId) {
    const deal = await db.query.deals.findFirst({
      where: and(eq(deals.orgId, orgId), eq(deals.id, input.dealId)),
      with: { contact: true, company: true },
    });
    if (deal) {
      if (deal.contactId) {
        const clientByContact = await db.query.clients.findFirst({
          where: and(eq(clients.orgId, orgId), eq(clients.contactId, deal.contactId)),
        });
        if (clientByContact) return clientByContact;
      }

      const clientName =
        input.clientName ||
        (deal.contact
          ? `${deal.contact.firstName} ${deal.contact.lastName || ""}`.trim()
          : deal.company?.name || deal.title || "Client");

      const [newClient] = await db
        .insert(clients)
        .values({
          orgId,
          contactId: deal.contactId || null,
          companyId: deal.companyId || null,
          name: clientName,
          email: deal.contact?.email || undefined,
          phone: deal.contact?.phone || undefined,
          portalToken: `pt_${crypto.randomUUID()}`,
        })
        .returning();
      return newClient;
    }
  }

  // 4. Default fallback: create new client by name
  const [fallbackClient] = await db
    .insert(clients)
    .values({
      orgId,
      name: input.clientName || "Client Account",
      portalToken: `pt_${crypto.randomUUID()}`,
    })
    .returning();
  return fallbackClient;
}

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
  revalidatePath(`/portal/${portalToken}`);

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
  const client = await resolveOrCreateClient(orgId, {
    clientId: data.clientId,
    dealId: data.dealId,
  });

  const total = data.items.reduce((sum, item) => sum + item.qty * item.price, 0);

  const [quote] = await db
    .insert(quotations)
    .values({
      orgId,
      clientId: client.id,
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

  dispatchWebhookEvent(orgId, "quote.created", {
    quoteId: quote.id,
    title: quote.title,
    clientId: quote.clientId,
    dealId: quote.dealId,
    total: quote.total,
  }).catch((err) => console.error("Webhook dispatch error:", err));

  revalidatePath("/dashboard/business-os");
  revalidatePath("/dashboard/quotes");
  revalidatePath(`/portal/${client.portalToken}`);
  return quote;
}

export async function createBusinessOsInvoice(data: {
  dealId?: string;
  clientId?: string;
  contactId?: string;
  clientName?: string;
  amount: number;
  dueDate?: string;
  status?: "draft" | "unpaid" | "paid" | "overdue";
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;
  const client = await resolveOrCreateClient(orgId, {
    clientId: data.clientId,
    contactId: data.contactId,
    dealId: data.dealId,
    clientName: data.clientName,
  });

  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  const dueDate = data.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const [inv] = await db
    .insert(invoices)
    .values({
      orgId,
      clientId: client.id,
      dealId: data.dealId || null,
      invoiceNumber,
      amount: data.amount,
      status: data.status || "unpaid",
      dueDate,
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "system",
    relatedDealId: data.dealId || null,
    body: `Issued Invoice ${inv.invoiceNumber} for ₹${data.amount.toLocaleString("en-IN")} (Client: ${client.name})`,
    source: "manual",
  });

  dispatchWebhookEvent(orgId, "invoice.issued", {
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId,
    dealId: inv.dealId,
    amount: inv.amount,
    status: inv.status,
    dueDate: inv.dueDate,
  }).catch((err) => console.error("Webhook dispatch error:", err));

  revalidatePath("/dashboard/business-os");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/deals");
  revalidatePath(`/portal/${client.portalToken}`);
  return inv;
}

export async function getInvoices() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.invoices.findMany({
    where: eq(invoices.orgId, session.user.orgId),
    with: {
      client: true,
      deal: true,
    },
    orderBy: [desc(invoices.createdAt)],
  });
}

export async function updateInvoiceStatus(
  id: string,
  status: "draft" | "unpaid" | "paid" | "overdue"
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [updated] = await db
    .update(invoices)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(and(eq(invoices.id, id), eq(invoices.orgId, session.user.orgId)))
    .returning();

  if (updated && updated.clientId) {
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, updated.clientId),
    });
    if (client) {
      revalidatePath(`/portal/${client.portalToken}`);
    }
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/business-os");
  revalidatePath("/dashboard/deals");
  return updated;
}
