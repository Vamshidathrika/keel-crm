import { NextResponse } from "next/server";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "tags:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;
  const results = await db.query.tags.findMany({
    where: eq(tags.orgId, orgId),
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "tags:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { name, color = "#2F5DFF" } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Field 'name' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newTag] = await db
      .insert(tags)
      .values({
        orgId,
        name: name.trim(),
        color,
      })
      .returning();

    return NextResponse.json({ data: newTag }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create tag" }, { status: 500 });
  }
}
