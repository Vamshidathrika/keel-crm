import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import { eq, and, desc, like, or } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";
import { runProspectorAgent } from "@/lib/agents/prospector";
import { resolveOrCreateCompany } from "@/lib/crm/companies";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "contacts:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

  const orgId = authResult.orgId!;
  let whereClause = eq(contacts.orgId, orgId);

  if (query) {
    const q = `%${query}%`;
    whereClause = and(
      eq(contacts.orgId, orgId),
      or(like(contacts.firstName, q), like(contacts.lastName, q), like(contacts.email, q), like(contacts.phone, q))
    ) as any;
  }

  const results = await db.query.contacts.findMany({
    where: whereClause,
    with: { company: true },
    orderBy: [desc(contacts.createdAt)],
    limit,
  });

  return NextResponse.json({
    data: results,
    count: results.length,
  });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "contacts:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      whatsapp,
      title,
      department,
      seniorityLevel,
      buyingRole,
      preferredChannel = "email",
      linkedinUrl,
      timezone,
      city,
      state,
      country,
      postalCode,
      companyId,
      companyName,
      website,
      tags = [],
      customFields = {},
    } = body;

    if (!firstName || typeof firstName !== "string") {
      return NextResponse.json({ error: "Field 'firstName' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    // Resolve or automatically provision company in the CRM
    const resolvedCompanyId = await resolveOrCreateCompany(orgId, {
      companyId,
      companyName,
      email,
      website,
      city,
      state,
      country,
      customFields,
    });

    const [newContact] = await db
      .insert(contacts)
      .values({
        orgId,
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        title: title?.trim() || null,
        department: department?.trim() || null,
        seniorityLevel: seniorityLevel || null,
        buyingRole: buyingRole || null,
        preferredChannel: preferredChannel || "email",
        linkedinUrl: linkedinUrl?.trim() || null,
        timezone: timezone?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || null,
        postalCode: postalCode?.trim() || null,
        companyId: resolvedCompanyId,
        source: "api_bridge",
        tags,
        customFields,
        score: 35,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedContactId: newContact.id,
      body: `Contact provisioned via Platform API v1 (#${newContact.id})`,
      source: "bridge",
    });

    // Asynchronously trigger autonomous Prospector agent
    runProspectorAgent(orgId, "contact", newContact.id, "event").catch((err) =>
      console.error("Prospector API trigger error:", err)
    );

    return NextResponse.json({ data: newContact }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create contact" }, { status: 500 });
  }
}
