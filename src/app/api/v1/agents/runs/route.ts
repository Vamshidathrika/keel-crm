import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentRuns } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "agents:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const agentType = searchParams.get("agentType");
  const status = searchParams.get("status");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(agentRuns.orgId, orgId)];
  if (agentType) conditions.push(eq(agentRuns.agentType, agentType));
  if (status) conditions.push(eq(agentRuns.status, status as any));

  const results = await db.query.agentRuns.findMany({
    where: and(...conditions),
    with: { actions: true },
    orderBy: [desc(agentRuns.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}
