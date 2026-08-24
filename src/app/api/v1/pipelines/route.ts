import { NextResponse } from "next/server";
import { db } from "@/db";
import { pipelines, stages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "pipelines:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;
  const results = await db.query.pipelines.findMany({
    where: eq(pipelines.orgId, orgId),
    with: { stages: { orderBy: (stages, { asc }) => [asc(stages.order)] } },
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "pipelines:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { name, isDefault = false, stages: stagesInput = [] } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Field 'name' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newPipeline] = await db
      .insert(pipelines)
      .values({
        orgId,
        name: name.trim(),
        isDefault: Boolean(isDefault),
      })
      .returning();

    const stageRecords = [];
    if (Array.isArray(stagesInput) && stagesInput.length > 0) {
      for (let i = 0; i < stagesInput.length; i++) {
        const s = stagesInput[i];
        const [createdStage] = await db
          .insert(stages)
          .values({
            pipelineId: newPipeline.id,
            name: s.name,
            order: i,
            type: s.type || "open",
            probability: s.probability || 10,
            color: s.color || "#2F5DFF",
          })
          .returning();
        stageRecords.push(createdStage);
      }
    }

    return NextResponse.json({ data: { ...newPipeline, stages: stageRecords } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create pipeline" }, { status: 500 });
  }
}
