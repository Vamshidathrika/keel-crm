import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients, activities } from "@/db/schema";
import { eq, and, desc, like, or } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";
import crypto from "crypto";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "clients:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  let whereClause = eq(clients.orgId, orgId);

  if (query) {
    const q = `%${query}%`;
    whereClause = and(
      eq(clients.orgId, orgId),
      or(like(clients.name, q), like(clients.email, q), like(clients.phone, q))
    ) as any;
  }

  const results = await db.query.clients.findMany({
    where: whereClause,
    with: { company: true, contact: true, projects: true, invoices: true },
    orderBy: [desc(clients.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "clients:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { name, email, phone, companyId, contactId } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Field 'name' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;
    const portalToken = crypto.randomBytes(16).toString("hex");

    const [newClient] = await db
      .insert(clients)
      .values({
        orgId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        companyId: companyId || null,
        contactId: contactId || null,
        portalToken,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedContactId: contactId || null,
      relatedCompanyId: companyId || null,
      body: `Client account created: "${newClient.name}"`,
      source: "bridge",
    });

    return NextResponse.json({ data: newClient }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create client" }, { status: 500 });
  }
}
