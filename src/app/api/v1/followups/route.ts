import { NextResponse } from "next/server";
import { db } from "@/db";
import { followups, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "followups:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const dealId = searchParams.get("dealId");
  const status = searchParams.get("status") as any;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(followups.orgId, orgId)];
  if (contactId) conditions.push(eq(followups.contactId, contactId));
  if (dealId) conditions.push(eq(followups.dealId, dealId));
  if (status && ["pending", "completed", "overdue"].includes(status)) {
    conditions.push(eq(followups.status, status));
  }

  const results = await db.query.followups.findMany({
    where: and(...conditions),
    with: { contact: true, deal: true },
    orderBy: [desc(followups.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "followups:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { title, dueDate, contactId, dealId, description, suggestedDraft } = body;

    if (!title || !dueDate) {
      return NextResponse.json({ error: "Fields 'title' and 'dueDate' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newFollowup] = await db
      .insert(followups)
      .values({
        orgId,
        title: title.trim(),
        dueDate,
        contactId: contactId || null,
        dealId: dealId || null,
        description: description || suggestedDraft || null,
        status: "pending",
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedContactId: contactId || null,
      relatedDealId: dealId || null,
      body: `Scheduled follow-up: "${newFollowup.title}" for ${dueDate}`,
      source: "bridge",
    });

    return NextResponse.json({ data: newFollowup }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to schedule follow-up" }, { status: 500 });
  }
}
