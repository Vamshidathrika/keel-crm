import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "tasks:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const isDone = searchParams.get("isDone");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(tasks.orgId, orgId)];
  if (isDone !== null && isDone !== undefined && isDone !== "") {
    conditions.push(eq(tasks.isDone, isDone === "true"));
  }

  const results = await db.query.tasks.findMany({
    where: and(...conditions),
    with: { assignee: true, relatedContact: true, relatedDeal: true, relatedCompany: true },
    orderBy: [desc(tasks.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "tasks:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { title, description, dueDate, dealId, contactId, companyId, assigneeId } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Field 'title' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newTask] = await db
      .insert(tasks)
      .values({
        orgId,
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate || null,
        relatedDealId: dealId || null,
        relatedContactId: contactId || null,
        relatedCompanyId: companyId || null,
        assigneeId: assigneeId || null,
        isDone: false,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "task",
      relatedDealId: dealId || null,
      relatedContactId: contactId || null,
      relatedCompanyId: companyId || null,
      body: `Task created: "${newTask.title}"`,
      source: "bridge",
    });

    return NextResponse.json({ data: newTask }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create task" }, { status: 500 });
  }
}
