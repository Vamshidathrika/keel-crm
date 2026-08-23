import React from "react";
import { db } from "@/db";
import { invoices, organizations, clients, quotations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import InvoicePrintClient from "./invoice-print-client";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const invoiceId = resolvedParams.id;
  if (!invoiceId) notFound();

  // 1. Fetch Invoice
  const invoiceObj = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      client: {
        with: {
          company: true,
        },
      },
    },
  });

  if (!invoiceObj) notFound();

  // 2. Fetch Org & Branding
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, invoiceObj.orgId),
  });

  const branding = (org?.brandingConfig as any) || {};

  // 3. Fetch Quotation items associated with this deal
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
