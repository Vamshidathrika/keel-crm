import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "audit:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const action = searchParams.get("action");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(auditLogs.orgId, orgId)];
  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
  if (action) conditions.push(eq(auditLogs.action, action));

  const results = await db.query.auditLogs.findMany({
    where: and(...conditions),
    with: { actorUserId: true },
    orderBy: [desc(auditLogs.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}
