"use server";

import { db } from "@/db";
import {
  contacts,
  clients,
  companies,
  deals,
  invoices,
  payments,
  quotations,
  projects,
  deliverables,
  tasks,
  followups,
  notes,
  activities,
  messageRecords,
  users,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, or } from "drizzle-orm";

export interface Customer360Data {
  contact: any;
  client: any | null;
  company: any | null;
  assignedOwner: any | null;
  financials: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    collectionRate: number;
    activePipelineValue: number;
    dealCount: number;
    invoiceCount: number;
    paymentCount: number;
  };
  deals: any[];
  invoices: any[];
  payments: any[];
  quotes: any[];
  projects: any[];
  tasks: any[];
  followups: any[];
  timeline: Array<{
    id: string;
    type: "payment" | "invoice" | "quote" | "deal" | "whatsapp" | "email" | "task" | "note" | "activity";
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  aiHealth: {
    healthScore: number;
    status: "thriving" | "stable" | "at_risk";
    churnRisk: "low" | "medium" | "high";
    sentiment: "positive" | "neutral" | "negative";
    summary: string;
    nextBestAction: string;
  };
}

/**
 * Aggregates complete 360-degree relationship intelligence for any contact or client
 */
export async function getCustomer360Data(contactId: string): Promise<Customer360Data | null> {
  const session = await auth();
  if (!session?.user) return null;

  const { orgId } = session.user;

  // 1. Fetch Contact
  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.orgId, orgId)),
    with: {
      company: true,
      owner: true,
    },
  });

  if (!contact) return null;

  // 2. Fetch or link Client record
  let client = await db.query.clients.findFirst({
    where: and(eq(clients.contactId, contact.id), eq(clients.orgId, orgId)),
  });

  if (!client && contact.companyId) {
    client = await db.query.clients.findFirst({
      where: and(eq(clients.companyId, contact.companyId), eq(clients.orgId, orgId)),
    });
  }

  // 3. Fetch Deals
  const contactDeals = await db.query.deals.findMany({
    where: and(
      or(eq(deals.contactId, contact.id), contact.companyId ? eq(deals.companyId, contact.companyId) : undefined),
      eq(deals.orgId, orgId)
    ),
    orderBy: [desc(deals.createdAt)],
  });

  const dealIds = contactDeals.map((d) => d.id);

  // 4. Fetch Invoices & Payments
  const clientInvoices = await db.query.invoices.findMany({
    where: and(
      client ? eq(invoices.clientId, client.id) : undefined,
      eq(invoices.orgId, orgId)
    ),
    orderBy: [desc(invoices.createdAt)],
  });

  const invoiceIds = clientInvoices.map((i) => i.id);

  const clientPayments = await db.query.payments.findMany({
    where: eq(payments.orgId, orgId),
    with: {
      invoice: true,
    },
    orderBy: [desc(payments.paidAt)],
  });

  const relevantPayments = clientPayments.filter((p) =>
    invoiceIds.includes(p.invoiceId || "")
  );

  // 5. Fetch Quotes & Projects
  const quotesList = await db.query.quotations.findMany({
    where: and(
      client ? eq(quotations.clientId, client.id) : undefined,
      eq(quotations.orgId, orgId)
    ),
    orderBy: [desc(quotations.createdAt)],
  });

  const projectsList = await db.query.projects.findMany({
    where: and(
      client ? eq(projects.clientId, client.id) : undefined,
      eq(projects.orgId, orgId)
    ),
    with: {
      deliverables: true,
    },
  });

  // 6. Fetch Tasks & Followups
  const tasksList = await db.query.tasks.findMany({
    where: and(
      or(eq(tasks.relatedContactId, contact.id), contact.companyId ? eq(tasks.relatedCompanyId, contact.companyId) : undefined),
      eq(tasks.orgId, orgId)
    ),
    orderBy: [desc(tasks.createdAt)],
  });

  const followupsList = await db.query.followups.findMany({
    where: and(eq(followups.contactId, contact.id), eq(followups.orgId, orgId)),
    orderBy: [desc(followups.createdAt)],
  });

  // 7. Fetch Notes & Messages
  const notesList = await db.query.notes.findMany({
    where: and(eq(notes.relatedContactId, contact.id), eq(notes.orgId, orgId)),
    orderBy: [desc(notes.createdAt)],
  });

  const messagesList = await db.query.messageRecords.findMany({
    where: and(
      or(eq(messageRecords.contactId, contact.id), client ? eq(messageRecords.clientId, client.id) : undefined),
      eq(messageRecords.orgId, orgId)
    ),
    orderBy: [desc(messageRecords.createdAt)],
  });

  // 8. Compute Financial Totals
  const totalInvoiced = clientInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalPaid = clientInvoices.reduce((sum, i) => sum + (i.paidAmount || (i.status === "paid" ? i.amount : 0)), 0);
  const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 100;
  const activePipelineValue = contactDeals
    .filter((d) => !d.closedAt)
    .reduce((sum, d) => sum + (d.value || 0), 0);

  // 9. Build Unified Chronological 360 Timeline
  const timeline: Customer360Data["timeline"] = [];

  // Add Payments
  for (const p of relevantPayments) {
    timeline.push({
      id: `pay_${p.id}`,
      type: "payment",
      title: `Payment Received: ₹${p.amount?.toLocaleString("en-IN")}`,
      description: `Settled via ${p.paymentMode?.toUpperCase() || "DIRECT"}. Reference: ${p.referenceNumber || "N/A"}.`,
      timestamp: p.paidAt || p.createdAt,
      metadata: { amount: p.amount, mode: p.paymentMode, ref: p.referenceNumber },
    });
  }

  // Add Invoices
  for (const inv of clientInvoices) {
    timeline.push({
      id: `inv_${inv.id}`,
      type: "invoice",
      title: `Invoice Issued: ${inv.invoiceNumber}`,
      description: `Amount: ₹${inv.amount?.toLocaleString("en-IN")}, Status: ${inv.status?.toUpperCase()}, Due: ${inv.dueDate}`,
      timestamp: inv.createdAt,
      metadata: { invoiceNumber: inv.invoiceNumber, amount: inv.amount, status: inv.status },
    });
  }

  // Add Quotes
  for (const q of quotesList) {
    timeline.push({
      id: `qte_${q.id}`,
      type: "quote",
      title: `Quotation: ${q.title}`,
      description: `Total: ₹${q.total?.toLocaleString("en-IN")}, Status: ${q.status?.toUpperCase()}${q.signerName ? ` (Signed by ${q.signerName})` : ""}`,
      timestamp: q.signedAt || q.createdAt,
      metadata: { title: q.title, total: q.total, status: q.status },
    });
  }

  // Add Deals
  for (const d of contactDeals) {
    timeline.push({
      id: `deal_${d.id}`,
      type: "deal",
      title: `Deal: ${d.title}`,
      description: `Value: ₹${d.value?.toLocaleString("en-IN")}, Stage: ${d.stageId?.toUpperCase()}`,
      timestamp: d.createdAt,
      metadata: { value: d.value, stage: d.stageId },
    });
  }

  // Add Messages
  for (const m of messagesList) {
    timeline.push({
      id: `msg_${m.id}`,
      type: m.type === "whatsapp" ? "whatsapp" : "email",
      title: `${m.type === "whatsapp" ? "WhatsApp Message" : "Email"} (${m.direction.toUpperCase()})`,
      description: m.text,
      timestamp: m.createdAt,
    });
  }

  // Add Notes
  for (const n of notesList) {
    timeline.push({
      id: `note_${n.id}`,
      type: "note",
      title: "Internal Note Added",
      description: n.body,
      timestamp: n.createdAt,
    });
  }

  // Sort unified timeline descending
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 10. AI Health Score Calculation
  let healthScore = 85;
  let churnRisk: "low" | "medium" | "high" = "low";
  let sentiment: "positive" | "neutral" | "negative" = "positive";

  if (totalOutstanding > 100000) {
    healthScore -= 20;
    churnRisk = "medium";
  }
  if (contactDeals.some((d) => d.lostReason)) {
    healthScore -= 15;
  }
  if (healthScore < 60) {
    churnRisk = "high";
    sentiment = "negative";
  } else if (healthScore < 80) {
    churnRisk = "medium";
    sentiment = "neutral";
  }

  const contactFullName = `${contact.firstName} ${contact.lastName || ""}`.trim();

  const aiHealth: Customer360Data["aiHealth"] = {
    healthScore,
    status: healthScore >= 80 ? "thriving" : healthScore >= 60 ? "stable" : "at_risk",
    churnRisk,
    sentiment,
    summary: `${contactFullName} is a high-value stakeholder at ${contact.company?.name || "the enterprise account"}. Lifetime invoiced value is ₹${totalInvoiced.toLocaleString("en-IN")} with a ${collectionRate}% collection rate.`,
    nextBestAction: totalOutstanding > 0
      ? `Follow up on outstanding balance of ₹${totalOutstanding.toLocaleString("en-IN")} due on recent invoices.`
      : activePipelineValue > 0
      ? `Schedule executive demo call to accelerate active deals (₹${activePipelineValue.toLocaleString("en-IN")}).`
      : `Send quarterly relationship check-in and explore expansion opportunities.`,
  };

  return {
    contact,
    client,
    company: contact.company || null,
    assignedOwner: contact.owner || null,
    financials: {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      collectionRate,
      activePipelineValue,
      dealCount: contactDeals.length,
      invoiceCount: clientInvoices.length,
      paymentCount: relevantPayments.length,
    },
    deals: contactDeals,
    invoices: clientInvoices,
    payments: relevantPayments,
    quotes: quotesList,
    projects: projectsList,
    tasks: tasksList,
    followups: followupsList,
    timeline,
    aiHealth,
  };
}
