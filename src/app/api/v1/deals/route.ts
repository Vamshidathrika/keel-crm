import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, pipelines, activities, contacts, companies } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";
import { runDealDoctorAgent } from "@/lib/agents/deal-doctor";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "deals:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const pipelineId = searchParams.get("pipelineId");
  const stageId = searchParams.get("stageId");
  const forecastCategory = searchParams.get("forecastCategory");
  const leadType = searchParams.get("leadType");
  const minAmount = searchParams.get("minAmount") ? parseFloat(searchParams.get("minAmount")!) : undefined;
  const maxAmount = searchParams.get("maxAmount") ? parseFloat(searchParams.get("maxAmount")!) : undefined;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(deals.orgId, orgId)];
  if (pipelineId) conditions.push(eq(deals.pipelineId, pipelineId));
  if (stageId) conditions.push(eq(deals.stageId, stageId));
  if (forecastCategory) conditions.push(eq(deals.forecastCategory, forecastCategory as any));
  if (leadType) conditions.push(eq(deals.leadType, leadType as any));

  const results = await db.query.deals.findMany({
    where: and(...conditions),
    with: { stage: true, contact: true, company: true },
    orderBy: [desc(deals.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "deals:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const {
      title,
      value,
      pipelineId,
      stageId,
      contactId,
      companyId,
      expectedCloseDate,
      forecastCategory = "pipeline",
      leadType = "spear",
      probability = 10,
      lostReason,
      lostReasonNotes,
      currency = "INR",
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Field 'title' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    let targetPipelineId = pipelineId;
    let targetStageId = stageId;

    if (!targetPipelineId || !targetStageId) {
      const defaultPipeline = await db.query.pipelines.findFirst({
        where: and(eq(pipelines.orgId, orgId), eq(pipelines.isDefault, true)),
        with: { stages: true },
      });

      if (defaultPipeline && defaultPipeline.stages.length > 0) {
        targetPipelineId = targetPipelineId || defaultPipeline.id;
        targetStageId = targetStageId || defaultPipeline.stages[0].id;
      }
    }

    if (!targetPipelineId || !targetStageId) {
      return NextResponse.json({ error: "No default pipeline or stage configured for organization." }, { status: 400 });
    }

    let validContactId: string | null = null;
    if (contactId) {
      const existingContact = await db.query.contacts.findFirst({
        where: and(eq(contacts.orgId, orgId), eq(contacts.id, contactId)),
      });
      if (existingContact) validContactId = existingContact.id;
    }

    let validCompanyId: string | null = null;
    if (companyId) {
      const existingCompany = await db.query.companies.findFirst({
        where: and(eq(companies.orgId, orgId), eq(companies.id, companyId)),
      });
      if (existingCompany) validCompanyId = existingCompany.id;
    }

    const [newDeal] = await db
      .insert(deals)
      .values({
        orgId,
        title: title.trim(),
        value: Number(value) || 0,
        pipelineId: targetPipelineId,
        stageId: targetStageId,
        contactId: validContactId,
        companyId: validCompanyId,
        expectedCloseDate: expectedCloseDate || null,
        forecastCategory: forecastCategory as any,
        leadType: leadType as any,
        probability: Number(probability) || 10,
        lostReason: lostReason || null,
        lostReasonNotes: lostReasonNotes || null,
        currency,
        source: "api_bridge",
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedDealId: newDeal.id,
      body: `Deal created via Platform API v1: "${newDeal.title}" (${currency} ${newDeal.value.toLocaleString()})`,
      source: "bridge",
    });

    // Asynchronously trigger autonomous Deal Doctor agent
    runDealDoctorAgent(orgId, newDeal.id, "event").catch((err) =>
      console.error("Deal Doctor API trigger error:", err)
    );

    return NextResponse.json({ data: newDeal }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create deal" }, { status: 500 });
  }
}
