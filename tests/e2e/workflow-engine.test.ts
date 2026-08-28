import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import {
  organizations,
  users,
  automations,
  automationConditions,
  automationActions,
  automationRuns,
  tasks,
  notifications,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { executeWorkflowGraph } from "@/lib/workflow-executor";

describe("⚡ Enterprise DAG Workflow & Automation Engine", () => {
  const testOrgId = "org_test_workflow_" + Date.now();
  const testUserId = "usr_test_wf_admin_" + Date.now();
  let testAutoId = "";

  before(async () => {
    // Setup test organization & admin user
    await db.insert(organizations).values({
      id: testOrgId,
      name: "Workflow Test Workspace",
      slug: "workflow-test-" + Date.now(),
    });

    await db.insert(users).values({
      id: testUserId,
      orgId: testOrgId,
      email: `wf_admin_${Date.now()}@acme.com`,
      name: "Workflow Admin",
      role: "admin",
      passwordHash: "hashed_pass_test",
    });
  });

  after(async () => {
    // Clean up
    if (testAutoId) {
      await db.delete(automationRuns).where(eq(automationRuns.automationId, testAutoId));
      await db.delete(automationActions).where(eq(automationActions.automationId, testAutoId));
      await db.delete(automationConditions).where(eq(automationConditions.automationId, testAutoId));
      await db.delete(automations).where(eq(automations.id, testAutoId));
    }
    await db.delete(tasks).where(eq(tasks.orgId, testOrgId));
    await db.delete(notifications).where(eq(notifications.orgId, testOrgId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  });

  it("1. Should provision a multi-step automation rule with visual DAG graph metadata", async () => {
    const [auto] = await db
      .insert(automations)
      .values({
        orgId: testOrgId,
        name: "High Value Deal Auto-Task",
        description: "Creates urgent review task for enterprise deals > ₹1,00,000",
        trigger: "deal_stage_changed",
        graphData: {
          nodes: [
            { id: "node-1", type: "trigger", position: { x: 50, y: 150 }, data: { label: "Deal Moved" } },
            { id: "node-2", type: "condition", position: { x: 400, y: 150 }, data: { ruleText: "dealValue >= 100000" } },
            { id: "node-3", type: "action", position: { x: 800, y: 150 }, data: { label: "Create Task" } },
          ],
          edges: [
            { id: "e1-2", source: "node-1", target: "node-2" },
            { id: "e2-3", source: "node-2", target: "node-3" },
          ],
        },
        isEnabled: true,
      })
      .returning();

    testAutoId = auto.id;

    // Insert condition
    await db.insert(automationConditions).values({
      automationId: auto.id,
      field: "dealValue",
      operator: "gt",
      value: "100000",
    });

    // Insert action
    await db.insert(automationActions).values({
      automationId: auto.id,
      actionType: "create_task",
      config: {
        title: "Urgent: Review Enterprise Deal Contract",
        dueDays: 1,
        priority: "high",
      },
      order: 1,
    });

    assert.strictEqual(auto.name, "High Value Deal Auto-Task");
    assert.strictEqual(auto.graphData?.nodes.length, 3);
  });

  it("2. Should skip action execution if rule conditions are not met", async () => {
    const lowValuePayload = {
      dealValue: 45000, // < 100000 condition threshold
      title: "Small Business Subscription",
    };

    const result = await executeWorkflowGraph(testAutoId, lowValuePayload);
    assert.strictEqual(result.status, "skipped");
    assert.ok(result.logs.some((l) => l.status === "skipped"));
  });

  it("3. Should execute full DAG pipeline and provision task & notification when conditions pass", async () => {
    const highValuePayload = {
      dealValue: 250000, // > 100000 condition threshold
      title: "Reliance Logistics Division",
      ownerId: testUserId,
    };

    const result = await executeWorkflowGraph(testAutoId, highValuePayload);
    assert.strictEqual(result.status, "success");
    assert.strictEqual(result.success, true);
    assert.ok(result.executionTimeMs >= 0);

    // Verify task created in database
    const createdTask = await db.query.tasks.findFirst({
      where: eq(tasks.orgId, testOrgId),
    });

    assert.ok(createdTask);
    assert.strictEqual(createdTask.title, "Urgent: Review Enterprise Deal Contract");
    assert.strictEqual(createdTask.priority, "high");

    // Verify automation run trace recorded
    const runRecord = await db.query.automationRuns.findFirst({
      where: and(eq(automationRuns.automationId, testAutoId), eq(automationRuns.status, "success")),
      orderBy: (runs, { desc }) => [desc(runs.id)],
    });

    assert.ok(runRecord);
    assert.strictEqual(runRecord.status, "success");
    assert.ok(runRecord.logs && runRecord.logs.length > 0);
  });
});
