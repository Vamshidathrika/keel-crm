import React from "react";
import { db } from "@/db";
import { quotations, organizations, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import QuotePrintClient from "@/app/dashboard/quotes/[id]/quote-print-client";

export default async function PortalQuotePrintPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const resolvedParams = await params;
  const token = resolvedParams.token;
  const quoteId = resolvedParams.id;

  if (!token || !quoteId) notFound();

  // 1. Fetch Client by token to verify authorization
  const clientObj = await db.query.clients.findFirst({
    where: eq(clients.portalToken, token),
  });

  if (!clientObj) notFound();

  // 2. Fetch Quotation
  const quoteObj = await db.query.quotations.findFirst({
    where: and(eq(quotations.id, quoteId), eq(quotations.clientId, clientObj.id)),
    with: {
      client: {
        with: {
          company: true,
        },
      },
    },
  });

  if (!quoteObj) notFound();

  // 3. Fetch Org & Branding
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
