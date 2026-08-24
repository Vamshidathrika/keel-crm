import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "invoices:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const dealId = searchParams.get("dealId");
  const status = searchParams.get("status") as any;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(invoices.orgId, orgId)];
  if (clientId) conditions.push(eq(invoices.clientId, clientId));
  if (dealId) conditions.push(eq(invoices.dealId, dealId));
  if (status && ["draft", "unpaid", "paid", "overdue"].includes(status)) {
    conditions.push(eq(invoices.status, status));
  }

  const results = await db.query.invoices.findMany({
    where: and(...conditions),
    with: { client: true, deal: true, payments: true },
    orderBy: [desc(invoices.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "invoices:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { clientId, dealId, amount, dueDate, pdfUrl } = body;

    if (amount === undefined || !dueDate) {
      return NextResponse.json({ error: "Fields 'amount' and 'dueDate' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const [newInvoice] = await db
      .insert(invoices)
      .values({
        orgId,
        invoiceNumber,
        clientId: clientId || null,
        dealId: dealId || null,
        amount: Number(amount) || 0,
        dueDate,
        status: "unpaid",
        pdfUrl: pdfUrl || null,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedDealId: dealId || null,
      body: `Invoice issued: ${newInvoice.invoiceNumber} (₹${newInvoice.amount.toLocaleString()}) - Due: ${dueDate}`,
      source: "bridge",
    });

    return NextResponse.json({ data: newInvoice }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create invoice" }, { status: 500 });
  }
}
