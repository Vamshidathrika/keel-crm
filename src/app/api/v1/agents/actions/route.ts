import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentActionQueue, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "agents:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(agentActionQueue.orgId, orgId)];
  if (status) conditions.push(eq(agentActionQueue.status, status as any));

  const results = await db.query.agentActionQueue.findMany({
    where: and(...conditions),
    with: { run: true, reviewedBy: true },
    orderBy: [desc(agentActionQueue.createdAt)],
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
    const { actionId, decision, rejectionReason } = body;

    if (!actionId || !["approved", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "Fields 'actionId' and 'decision' ('approved' | 'rejected') are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const action = await db.query.agentActionQueue.findFirst({
      where: and(eq(agentActionQueue.id, actionId), eq(agentActionQueue.orgId, orgId)),
    });

    if (!action) {
      return NextResponse.json({ error: "Action not found." }, { status: 404 });
    }

    const [updatedAction] = await db
      .update(agentActionQueue)
      .set({
        status: decision === "approved" ? "executed" : "rejected",
        reviewedAt: new Date().toISOString(),
        rejectionReason: decision === "rejected" ? rejectionReason || null : null,
      })
      .where(eq(agentActionQueue.id, actionId))
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      body: `Agent action ${decision.toUpperCase()}: "${action.title}"`,
      source: "ai",
    });

    return NextResponse.json({ data: updatedAction });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process agent action" }, { status: 500 });
  }
}
