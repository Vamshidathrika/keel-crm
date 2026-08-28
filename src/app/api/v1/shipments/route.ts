import { NextResponse } from "next/server";
import { db } from "@/db";
import { shipments, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "shipments:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get("dealId");
  const status = searchParams.get("status");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(shipments.orgId, orgId)];
  if (dealId) conditions.push(eq(shipments.dealId, dealId));
  if (status) conditions.push(eq(shipments.status, status));

  const results = await db.query.shipments.findMany({
    where: and(...conditions),
    with: { deal: true },
    orderBy: [desc(shipments.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "shipments:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const {
      dealName,
      carrier,
      origin,
      destination,
      eta,
      mode = "Ocean Freight",
      cost = "0",
      dealId,
      status = "Booking Confirmed",
      trackingNumber,
      vesselOrFlight,
      weightKg,
      volumeCbm,
    } = body;

    if (!dealName || !carrier || !origin || !destination || !eta) {
      return NextResponse.json({ error: "Required fields: dealName, carrier, origin, destination, eta" }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newShipment] = await db
      .insert(shipments)
      .values({
        orgId,
        dealId: dealId || null,
        dealName: dealName.trim(),
        carrier: carrier.trim(),
        trackingNumber: trackingNumber?.trim() || null,
        vesselOrFlight: vesselOrFlight?.trim() || null,
        origin: origin.trim(),
        destination: destination.trim(),
        weightKg: weightKg !== undefined ? Number(weightKg) : null,
        volumeCbm: volumeCbm !== undefined ? Number(volumeCbm) : null,
        eta: eta.trim(),
        mode,
        cost: String(cost),
        status,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedDealId: dealId || null,
      body: `Logistics Shipment booked: ${origin} → ${destination} (${carrier}, ETA: ${eta})`,
      source: "bridge",
    });

    return NextResponse.json({ data: newShipment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create shipment" }, { status: 500 });
  }
}
