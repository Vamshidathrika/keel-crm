import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  organizations,
  users,
  contacts,
  deals,
  companies,
  activities,
  tasks,
  notes,
  invoices,
  quotations,
  clients,
  projects,
  followups,
  tags,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "org:export");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;

  // Fetch all tenant data concurrently with strict orgId isolation
  const [
    orgData,
    contactsData,
    dealsData,
    companiesData,
    activitiesData,
    tasksData,
    notesData,
    invoicesData,
    quotationsData,
    clientsData,
    projectsData,
    followupsData,
    tagsData,
  ] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),
    db.query.contacts.findMany({ where: eq(contacts.orgId, orgId) }),
    db.query.deals.findMany({ where: eq(deals.orgId, orgId) }),
    db.query.companies.findMany({ where: eq(companies.orgId, orgId) }),
    db.query.activities.findMany({ where: eq(activities.orgId, orgId) }),
    db.query.tasks.findMany({ where: eq(tasks.orgId, orgId) }),
    db.query.notes.findMany({ where: eq(notes.orgId, orgId) }),
    db.query.invoices.findMany({ where: eq(invoices.orgId, orgId) }),
    db.query.quotations.findMany({ where: eq(quotations.orgId, orgId) }),
    db.query.clients.findMany({ where: eq(clients.orgId, orgId) }),
    db.query.projects.findMany({ where: eq(projects.orgId, orgId) }),
    db.query.followups.findMany({ where: eq(followups.orgId, orgId) }),
    db.query.tags.findMany({ where: eq(tags.orgId, orgId) }),
  ]);

  const archive = {
    exportedAt: new Date().toISOString(),
    organization: orgData,
    counts: {
      contacts: contactsData.length,
      deals: dealsData.length,
      companies: companiesData.length,
      activities: activitiesData.length,
      tasks: tasksData.length,
      notes: notesData.length,
      invoices: invoicesData.length,
      quotations: quotationsData.length,
      clients: clientsData.length,
      projects: projectsData.length,
      followups: followupsData.length,
      tags: tagsData.length,
    },
    data: {
      contacts: contactsData,
      deals: dealsData,
      companies: companiesData,
      activities: activitiesData,
      tasks: tasksData,
      notes: notesData,
      invoices: invoicesData,
      quotations: quotationsData,
      clients: clientsData,
      projects: projectsData,
      followups: followupsData,
      tags: tagsData,
    },
  };

  return new NextResponse(JSON.stringify(archive, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="keel_crm_export_${orgData?.slug || orgId}_${Date.now()}.json"`,
    },
  });
}
