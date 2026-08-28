import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies, activities } from "@/db/schema";
import { eq, and, desc, like, or } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";
import { runProspectorAgent } from "@/lib/agents/prospector";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "companies:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  let whereClause = eq(companies.orgId, orgId);

  if (query) {
    const q = `%${query}%`;
    whereClause = and(
      eq(companies.orgId, orgId),
      or(like(companies.name, q), like(companies.domain, q), like(companies.industry, q))
    ) as any;
  }

  const results = await db.query.companies.findMany({
    where: whereClause,
    with: { contacts: true, deals: true },
    orderBy: [desc(companies.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "companies:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const {
      name,
      domain,
      industry,
      website,
      linkedinUrl,
      gstin,
      employeeCount,
      annualRevenue,
      address,
      city,
      state,
      country,
      postalCode,
      tags = [],
      customFields = {},
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Field 'name' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newCompany] = await db
      .insert(companies)
      .values({
        orgId,
        name: name.trim(),
        domain: domain?.trim() || null,
        industry: industry?.trim() || null,
        website: website?.trim() || null,
        linkedinUrl: linkedinUrl?.trim() || null,
        gstin: gstin?.trim() || null,
        employeeCount: employeeCount?.trim() || null,
        annualRevenue: annualRevenue || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || null,
        postalCode: postalCode?.trim() || null,
        tags,
        customFields,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedCompanyId: newCompany.id,
      body: `Company created via Platform API v1: "${newCompany.name}"`,
      source: "bridge",
    });

    // Asynchronously trigger autonomous Prospector agent
    runProspectorAgent(orgId, "company", newCompany.id, "event").catch((err) =>
      console.error("Prospector API trigger error:", err)
    );

    return NextResponse.json({ data: newCompany }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create company" }, { status: 500 });
  }
}
