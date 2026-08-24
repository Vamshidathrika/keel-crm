import { NextResponse } from "next/server";
import { db } from "@/db";
import { properties, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "properties:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(properties.orgId, orgId)];
  if (status) conditions.push(eq(properties.status, status));
  if (type) conditions.push(eq(properties.type, type));

  const results = await db.query.properties.findMany({
    where: and(...conditions),
    orderBy: [desc(properties.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "properties:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { title, location, price, type = "Commercial", status = "Available", buyerOrTenant } = body;

    if (!title || !location || !price) {
      return NextResponse.json({ error: "Fields 'title', 'location', and 'price' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newProperty] = await db
      .insert(properties)
      .values({
        orgId,
        title: title.trim(),
        location: location.trim(),
        price: String(price),
        type,
        status,
        buyerOrTenant: buyerOrTenant || null,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      body: `Real Estate Property listed: "${newProperty.title}" in ${location} (${price})`,
      source: "bridge",
    });

    return NextResponse.json({ data: newProperty }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list property" }, { status: 500 });
  }
}
