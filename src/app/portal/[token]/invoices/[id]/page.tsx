import React from "react";
import { db } from "@/db";
import { invoices, organizations, clients, quotations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import InvoicePrintClient from "@/app/dashboard/invoices/[id]/invoice-print-client";

export default async function PortalInvoicePrintPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const resolvedParams = await params;
  const token = resolvedParams.token;
  const invoiceId = resolvedParams.id;

  if (!token || !invoiceId) notFound();

  // 1. Fetch Client by token to verify authorization
  const clientObj = await db.query.clients.findFirst({
    where: eq(clients.portalToken, token),
  });

  if (!clientObj) notFound();

  // 2. Fetch Invoice
  const invoiceObj = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.clientId, clientObj.id)),
    with: {
      client: {
        with: {
          company: true,
        },
      },
    },
  });

  if (!invoiceObj) notFound();

  // 3. Fetch Org & Branding
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, invoiceObj.orgId),
  });

  const branding = (org?.brandingConfig as any) || {};

  // 4. Fetch Quotation items
  let items = [{ name: "Services rendered as per contract", qty: 1, price: invoiceObj.amount }];
  if (invoiceObj.dealId) {
    const qte = await db.query.quotations.findFirst({
      where: and(
        eq(quotations.dealId, invoiceObj.dealId),
        eq(quotations.clientId, invoiceObj.clientId || "")
      ),
    });
    if (qte?.items && Array.isArray(qte.items)) {
      items = qte.items as any;
    }
  }

  return (
    <InvoicePrintClient
      invoice={invoiceObj}
      branding={branding}
      orgName={org?.name || "Keel CRM Corp"}
      items={items}
    />
  );
}
