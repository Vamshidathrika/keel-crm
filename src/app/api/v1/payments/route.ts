import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, invoices, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "payments:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(payments.orgId, orgId)];
  if (invoiceId) conditions.push(eq(payments.invoiceId, invoiceId));

  const results = await db.query.payments.findMany({
    where: and(...conditions),
    with: { invoice: true },
    orderBy: [desc(payments.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "payments:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { invoiceId, amount, transactionId, referenceNumber, status = "completed" } = body;

    if (!invoiceId || amount === undefined) {
      return NextResponse.json({ error: "Fields 'invoiceId' and 'amount' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;
    const txId = transactionId || referenceNumber || `TXN_${Date.now().toString()}`;

    const [newPayment] = await db
      .insert(payments)
      .values({
        orgId,
        invoiceId,
        amount: Number(amount) || 0,
        transactionId: txId,
        status: ["pending", "completed", "failed"].includes(status) ? status : "completed",
        paidAt: new Date().toISOString(),
      })
      .returning();

    // Mark invoice as paid if payment completed
    if (newPayment.status === "completed") {
      await db.update(invoices).set({ status: "paid" }).where(eq(invoices.id, invoiceId));
    }

    await db.insert(activities).values({
      orgId,
      type: "system",
      body: `Payment recorded: ₹${Number(amount).toLocaleString()} for Invoice #${invoiceId} (Tx: ${txId})`,
      source: "bridge",
    });

    return NextResponse.json({ data: newPayment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record payment" }, { status: 500 });
  }
}
