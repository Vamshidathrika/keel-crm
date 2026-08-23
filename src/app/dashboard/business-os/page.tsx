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

export default async function BusinessOsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;

  // Load all entities for the Business OS tabs
  const clientsData = await db.query.clients.findMany({
    where: eq(clients.orgId, orgId),
    with: {
      contact: true,
      company: true,
    },
  });

  const quotationsData = await db.query.quotations.findMany({
    where: eq(quotations.orgId, orgId),
    with: {
      client: true,
      deal: true,
    },
    orderBy: [desc(quotations.createdAt)],
  });

  const invoicesData = await db.query.invoices.findMany({
    where: eq(invoices.orgId, orgId),
    with: {
      client: true,
      payments: true,
    },
    orderBy: [desc(invoices.createdAt)],
  });

  const paymentsData = await db.query.payments.findMany({
    where: eq(payments.orgId, orgId),
    with: {
      invoice: true,
    },
  });

  const messageRecordsData = await db.query.messageRecords.findMany({
    where: eq(messageRecords.orgId, orgId),
    with: {
      client: true,
    },
    orderBy: [desc(messageRecords.createdAt)],
    limit: 50,
  });

  const followupsData = await db.query.followups.findMany({
    where: eq(followups.orgId, orgId),
    with: {
      contact: true,
      deal: true,
    },
    orderBy: [desc(followups.dueDate)],
  });

  const projectsData = await db.query.projects.findMany({
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
  });

  const dealsData = await db.query.deals.findMany({
    where: eq(deals.orgId, orgId),
    with: {
      contact: true,
    },
  });

  const teamUsers = await db.query.users.findMany({
    where: eq(users.orgId, orgId),
  });

  return (
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
  );
}
