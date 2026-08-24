import { NextResponse } from "next/server";
import { db } from "@/db";
import { notes, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "notes:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const dealId = searchParams.get("dealId");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(notes.orgId, orgId)];
  if (contactId) conditions.push(eq(notes.relatedContactId, contactId));
  if (dealId) conditions.push(eq(notes.relatedDealId, dealId));

  const results = await db.query.notes.findMany({
    where: and(...conditions),
    with: { author: true, relatedContact: true, relatedDeal: true, relatedCompany: true },
    orderBy: [desc(notes.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "notes:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { body: noteBody, contactId, dealId, companyId, authorId } = body;

    if (!noteBody || typeof noteBody !== "string") {
      return NextResponse.json({ error: "Field 'body' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newNote] = await db
      .insert(notes)
      .values({
        orgId,
        body: noteBody.trim(),
        relatedContactId: contactId || null,
        relatedDealId: dealId || null,
        relatedCompanyId: companyId || null,
        authorId: authorId || null,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "note",
      relatedDealId: dealId || null,
      relatedContactId: contactId || null,
      relatedCompanyId: companyId || null,
      body: `Note added: "${noteBody.slice(0, 80)}${noteBody.length > 80 ? "..." : ""}"`,
      source: "bridge",
    });

    return NextResponse.json({ data: newNote }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create note" }, { status: 500 });
  }
}
