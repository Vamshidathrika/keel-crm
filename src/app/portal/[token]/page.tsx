import React from "react";
import { db } from "@/db";
import { clients, organizations, projects, deliverables, invoices, quotations, messageRecords, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import PortalClient from "./portal-client";

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  const token = resolvedParams.token;
  if (!token) notFound();

  // 1. Fetch Client by portalToken
  const clientObj = await db.query.clients.findFirst({
    where: eq(clients.portalToken, token),
  });

  if (!clientObj) notFound();

  // 2. Fetch Org & Branding
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, clientObj.orgId),
  });

  const branding = (org?.brandingConfig as any) || {};

  // 3. Fetch Projects, Invoices, Quotes, Messages
  const clientProjects = await db.query.projects.findMany({
    where: eq(projects.clientId, clientObj.id),
    with: {
      projectTasks: true,
      deliverables: true,
    },
  });

  const clientInvoices = await db.query.invoices.findMany({
    where: eq(invoices.clientId, clientObj.id),
  });

  const clientQuotes = await db.query.quotations.findMany({
    where: eq(quotations.clientId, clientObj.id),
  });

  const chatMessages = await db.query.messageRecords.findMany({
    where: eq(messageRecords.clientId, clientObj.id),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  return (
    <PortalClient
      client={clientObj}
      branding={branding}
      orgName={org?.name || "Keel CRM Partner"}
      projects={clientProjects}
      invoices={clientInvoices}
      quotes={clientQuotes}
      initialMessages={chatMessages}
    />
  );
}
