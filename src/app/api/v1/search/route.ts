import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, companies, tasks } from "@/db/schema";
import { eq, and, like, or } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "search:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ contacts: [], deals: [], companies: [], tasks: [] });
  }

  const orgId = authResult.orgId!;
  const term = `%${q}%`;

  const [matchedContacts, matchedDeals, matchedCompanies, matchedTasks] = await Promise.all([
    db.query.contacts.findMany({
      where: and(
        eq(contacts.orgId, orgId),
        or(like(contacts.firstName, term), like(contacts.lastName, term), like(contacts.email, term), like(contacts.phone, term))
      ),
      limit: 10,
    }),
    db.query.deals.findMany({
      where: and(eq(deals.orgId, orgId), like(deals.title, term)),
      with: { stage: true },
      limit: 10,
    }),
    db.query.companies.findMany({
      where: and(
        eq(companies.orgId, orgId),
        or(like(companies.name, term), like(companies.domain, term), like(companies.industry, term))
      ),
      limit: 10,
    }),
    db.query.tasks.findMany({
      where: and(eq(tasks.orgId, orgId), like(tasks.title, term)),
      limit: 10,
    }),
  ]);

  return NextResponse.json({
    query: q,
    results: {
      contacts: matchedContacts,
      deals: matchedDeals,
      companies: matchedCompanies,
      tasks: matchedTasks,
    },
  });
}
