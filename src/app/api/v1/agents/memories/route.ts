import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentMemories } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "agents:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(agentMemories.orgId, orgId)];
  if (entityType) conditions.push(eq(agentMemories.entityType, entityType as any));
  if (entityId) conditions.push(eq(agentMemories.entityId, entityId));

  const results = await db.query.agentMemories.findMany({
    where: and(...conditions),
    orderBy: [desc(agentMemories.updatedAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "agents:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { entityType, entityId, key, value, confidence = 1.0, sourceAgent = "manual" } = body;

    if (!entityType || !entityId || !key || value === undefined) {
      return NextResponse.json({ error: "Fields 'entityType', 'entityId', 'key', and 'value' are required." }, { status: 400 });
    }

    // Security Hardening: Validate memory key namespace (alphanumeric, max 64 chars)
    const KEY_REGEX = /^[a-zA-Z0-9_.-]{2,64}$/;
    if (!KEY_REGEX.test(key.trim())) {
      return NextResponse.json(
        { error: "Invalid memory key format. Must be 2-64 alphanumeric characters with underscores/hyphens/dots." },
        { status: 400 }
      );
    }

    const cleanKey = key.trim();
    const orgId = authResult.orgId!;

    const existingMemory = await db.query.agentMemories.findFirst({
      where: and(
        eq(agentMemories.orgId, orgId),
        eq(agentMemories.entityType, entityType),
        eq(agentMemories.entityId, entityId),
        eq(agentMemories.key, cleanKey)
      ),
    });

    let savedMemory;
    if (existingMemory) {
      const [updated] = await db
        .update(agentMemories)
        .set({
          value,
          confidence,
          sourceAgent,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentMemories.id, existingMemory.id))
        .returning();
      savedMemory = updated;
    } else {
      const [created] = await db
        .insert(agentMemories)
        .values({
          orgId,
          entityType,
          entityId,
          key: cleanKey,
          value,
          confidence,
          sourceAgent,
        })
        .returning();
      savedMemory = created;
    }

    return NextResponse.json({ data: savedMemory }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to store agent memory" }, { status: 500 });
  }
}
