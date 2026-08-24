import { NextResponse } from "next/server";
import { db } from "@/db";
import { automations, automationConditions, automationActions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "automations:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;
  const results = await db.query.automations.findMany({
    where: eq(automations.orgId, orgId),
    with: { automationConditions: true, automationActions: true, runs: true },
    orderBy: [desc(automations.createdAt)],
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "automations:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { name, trigger, conditions = [], actions = [], isEnabled = true } = body;

    if (!name || !trigger) {
      return NextResponse.json({ error: "Fields 'name' and 'trigger' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newAutomation] = await db
      .insert(automations)
      .values({
        orgId,
        name: name.trim(),
        trigger,
        isEnabled: Boolean(isEnabled),
      })
      .returning();

    for (const c of conditions) {
      await db.insert(automationConditions).values({
        automationId: newAutomation.id,
        field: c.field,
        operator: c.operator,
        value: c.value,
      });
    }

    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      const validActionType = ["create_task", "send_notification", "call_webhook", "add_tag"].includes(a.actionType || a.type)
        ? (a.actionType || a.type)
        : "send_notification";

      await db.insert(automationActions).values({
        automationId: newAutomation.id,
        actionType: validActionType,
        config: a.config || {},
      });
    }

    return NextResponse.json({ data: newAutomation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create automation rule" }, { status: 500 });
  }
}
