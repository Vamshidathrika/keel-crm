import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "projects:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status") as any;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(projects.orgId, orgId)];
  if (clientId) conditions.push(eq(projects.clientId, clientId));
  if (status && ["planning", "active", "completed", "on_hold"].includes(status)) {
    conditions.push(eq(projects.status, status));
  }

  const results = await db.query.projects.findMany({
    where: and(...conditions),
    with: { client: true, deal: true, projectTasks: true, deliverables: true },
    orderBy: [desc(projects.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "projects:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const {
      name,
      clientId,
      dealId,
      status = "active",
      budget = 0,
      progressPercent = 0,
      startDate,
      targetDate,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Field 'name' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newProject] = await db
      .insert(projects)
      .values({
        orgId,
        name: name.trim(),
        clientId: clientId || null,
        dealId: dealId || null,
        status: ["planning", "active", "completed", "on_hold"].includes(status) ? status : "active",
        progressPercent: Number(progressPercent) || 0,
        startDate: startDate || null,
        targetDate: targetDate || null,
        budget: Number(budget) || 0,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedDealId: dealId || null,
      body: `Delivery Project initialized: "${newProject.name}" (Budget: ₹${newProject.budget.toLocaleString()})`,
      source: "bridge",
    });

    return NextResponse.json({ data: newProject }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create project" }, { status: 500 });
  }
}
