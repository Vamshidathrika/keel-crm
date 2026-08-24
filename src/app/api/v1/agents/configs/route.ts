import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentConfigs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "agents:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;
  const configs = await db.query.agentConfigs.findMany({
    where: eq(agentConfigs.orgId, orgId),
  });

  return NextResponse.json({ data: configs });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "agents:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { agentType, isEnabled, executionMode, sweepIntervalHours, model } = body;

    if (!agentType) {
      return NextResponse.json({ error: "Field 'agentType' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const existingConfig = await db.query.agentConfigs.findFirst({
      where: and(eq(agentConfigs.orgId, orgId), eq(agentConfigs.agentType, agentType)),
    });

    let result;
    if (existingConfig) {
      const [updated] = await db
        .update(agentConfigs)
        .set({
          isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : existingConfig.isEnabled,
          executionMode: executionMode || existingConfig.executionMode,
          sweepIntervalHours: sweepIntervalHours || existingConfig.sweepIntervalHours,
          model: model || existingConfig.model,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentConfigs.id, existingConfig.id))
        .returning();
      result = updated;
    } else {
      const [created] = await db
        .insert(agentConfigs)
        .values({
          orgId,
          agentType,
          isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
          executionMode: executionMode || "supervised",
          sweepIntervalHours: sweepIntervalHours || 24,
          model: model || "gemini-2.5-flash",
        })
        .returning();
      result = created;
    }

    return NextResponse.json({ data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update agent config" }, { status: 500 });
  }
}
