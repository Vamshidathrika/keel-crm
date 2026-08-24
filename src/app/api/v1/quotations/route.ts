import { NextResponse } from "next/server";
import { db } from "@/db";
import { quotations, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "quotations:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const dealId = searchParams.get("dealId");
  const status = searchParams.get("status") as any;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(quotations.orgId, orgId)];
  if (clientId) conditions.push(eq(quotations.clientId, clientId));
  if (dealId) conditions.push(eq(quotations.dealId, dealId));
  if (status && ["draft", "sent", "accepted", "rejected"].includes(status)) {
    conditions.push(eq(quotations.status, status));
  }

  const results = await db.query.quotations.findMany({
    where: and(...conditions),
    with: { client: true, deal: true },
    orderBy: [desc(quotations.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "quotations:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { title, clientId, dealId, total, amount, items = [], pdfUrl } = body;

    const finalTotal = total !== undefined ? Number(total) : (amount !== undefined ? Number(amount) : 0);

    if (!title) {
      return NextResponse.json({ error: "Field 'title' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newQuote] = await db
      .insert(quotations)
      .values({
        orgId,
        title: title.trim(),
        clientId: clientId || null,
        dealId: dealId || null,
        total: finalTotal,
        items,
        status: "draft",
        pdfUrl: pdfUrl || null,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedDealId: dealId || null,
      body: `Quotation generated: "${newQuote.title}" (Total: ₹${newQuote.total.toLocaleString()})`,
      source: "bridge",
    });

    return NextResponse.json({ data: newQuote }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create quotation" }, { status: 500 });
  }
}
