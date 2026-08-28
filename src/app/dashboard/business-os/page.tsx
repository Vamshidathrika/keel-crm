import React from "react";
import { db } from "@/db";
import {
  clients,
  quotations,
  invoices,
  payments,
  messageRecords,
  followups,
  projects,
  deliverables,
  contacts,
  deals,
  users,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BusinessOsClient from "./business-os-client";

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    console.warn("Non-fatal query timeout or failure in BusinessOsPage:", err?.message || err);
    return fallback;
  }
}

export default async function BusinessOsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;

  // Load all entities for the Business OS tabs with resilient error handling
  const [
    clientsData,
    quotationsData,
    invoicesData,
    paymentsData,
    messageRecordsData,
    followupsData,
    projectsData,
    dealsData,
    teamUsers,
  ] = await Promise.all([
    safeQuery(
      () =>
        db.query.clients.findMany({
          where: eq(clients.orgId, orgId),
          with: {
            contact: true,
            company: true,
          },
        }),
      []
    ),
    safeQuery(
      () =>
        db.query.quotations.findMany({
          where: eq(quotations.orgId, orgId),
          with: {
            client: true,
            deal: true,
          },
          orderBy: [desc(quotations.createdAt)],
        }),
      []
    ),
    safeQuery(
      () =>
        db.query.invoices.findMany({
          where: eq(invoices.orgId, orgId),
          with: {
            client: true,
            payments: true,
          },
          orderBy: [desc(invoices.createdAt)],
        }),
      []
    ),
    safeQuery(
      () =>
        db.query.payments.findMany({
          where: eq(payments.orgId, orgId),
          with: {
            invoice: true,
          },
        }),
      []
    ),
    safeQuery(
      () =>
        db.query.messageRecords.findMany({
          where: eq(messageRecords.orgId, orgId),
          with: {
            client: true,
          },
          orderBy: [desc(messageRecords.createdAt)],
          limit: 50,
        }),
      []
    ),
    safeQuery(
      () =>
        db.query.followups.findMany({
          where: eq(followups.orgId, orgId),
          with: {
            contact: true,
            deal: true,
          },
          orderBy: [desc(followups.dueDate)],
        }),
      []
    ),
    safeQuery(
      () =>
        db.query.projects.findMany({
          where: eq(projects.orgId, orgId),
          with: {
            client: true,
            projectTasks: {
              with: {
                assignee: true,
              },
            },
            deliverables: true,
          },
        }),
      []
    ),
    safeQuery(
      () =>
        db.query.deals.findMany({
          where: eq(deals.orgId, orgId),
          with: {
            contact: true,
          },
        }),
      []
    ),
    safeQuery(
      () =>
        db.query.users.findMany({
          where: eq(users.orgId, orgId),
        }),
      []
    ),
  ]);

  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading Business OS...</div>}>
      <BusinessOsClient
        user={session.user}
        initialClients={clientsData}
        initialQuotations={quotationsData}
        initialInvoices={invoicesData}
        initialPayments={paymentsData}
        initialMessages={messageRecordsData}
        initialFollowups={followupsData}
        initialProjects={projectsData}
        deals={dealsData}
        team={teamUsers}
      />
    </React.Suspense>
  );
}
