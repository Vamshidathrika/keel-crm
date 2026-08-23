import React from "react";
import { db } from "@/db";
import { quotations, organizations, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import QuotePrintClient from "./quote-print-client";

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const quoteId = resolvedParams.id;
  if (!quoteId) notFound();

  // 1. Fetch Quotation
  const quoteObj = await db.query.quotations.findFirst({
    where: eq(quotations.id, quoteId),
    with: {
      client: {
        with: {
          company: true,
        },
      },
    },
  });

  if (!quoteObj) notFound();

  // 2. Fetch Org & Branding
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, quoteObj.orgId),
  });

  const branding = (org?.brandingConfig as any) || {};

  // Resolve items
  const items = (quoteObj.items as any) || [];

  return (
    <QuotePrintClient
      quote={quoteObj}
      branding={branding}
      orgName={org?.name || "Keel CRM Corp"}
      items={items}
    />
  );
}
