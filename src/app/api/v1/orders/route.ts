import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "orders:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const fulfillmentStatus = searchParams.get("fulfillmentStatus");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(orders.orgId, orgId)];
  if (clientId) conditions.push(eq(orders.clientId, clientId));
  if (fulfillmentStatus) conditions.push(eq(orders.fulfillmentStatus, fulfillmentStatus));

  const results = await db.query.orders.findMany({
    where: and(...conditions),
    with: { client: true },
    orderBy: [desc(orders.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "orders:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { clientName, itemsSummary, totalAmount, clientId, fulfillmentStatus = "Processing", deliveryEta } = body;

    if (!clientName || !itemsSummary || totalAmount === undefined) {
      return NextResponse.json({ error: "Fields 'clientName', 'itemsSummary', and 'totalAmount' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const [newOrder] = await db
      .insert(orders)
      .values({
        orgId,
        orderNumber,
        clientId: clientId || null,
        clientName: clientName.trim(),
        itemsSummary: itemsSummary.trim(),
        totalAmount: String(totalAmount),
        fulfillmentStatus,
        deliveryEta: deliveryEta || null,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      body: `Order registered: #${newOrder.orderNumber} for ${clientName} (Total: ₹${totalAmount})`,
      source: "bridge",
    });

    return NextResponse.json({ data: newOrder }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create order" }, { status: 500 });
  }
}
