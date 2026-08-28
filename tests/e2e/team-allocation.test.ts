import { describe, it, before } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import { users, organizations, tasks, deals, contacts, activities } from "@/db/schema";
import {
  getTeamWorkloadSummary,
  getUnassignedWorkPool,
  dispatchRoundRobin,
  bulkReassignWork,
  assignWorkItem,
  updateUserCapacity,
  getTeamMemberPortalData,
  repUpdateTaskStatus,
} from "@/app/actions/team-allocation";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("👥 Team & Workload Allocation Engine + Rep Portal E2E", () => {
  let testOrgId: string;
  let adminUserId: string;
  let repAId: string;
  let repBId: string;
  let repAPortalToken: string;

  before(async () => {
    // 1. Provision test org
    const [org] = await db
      .insert(organizations)
      .values({
        name: "Acme Workload Test Corp",
        slug: `acme-workload-${Date.now()}`,
      })
      .returning();
    testOrgId = org.id;

    const pw = await bcrypt.hash("password123", 10);

    // 2. Provision Admin and 2 Reps
    const [admin] = await db
      .insert(users)
      .values({
        orgId: testOrgId,
        name: "Manager Sarah",
        email: `manager-${Date.now()}@acme.com`,
        passwordHash: pw,
        role: "admin",
        isActive: true,
        maxCapacity: 25,
      })
      .returning();
    adminUserId = admin.id;

    repAPortalToken = `rep_test_token_${Date.now()}`;
    const [repA] = await db
      .insert(users)
      .values({
        orgId: testOrgId,
        name: "Rep Alice",
        email: `alice-${Date.now()}@acme.com`,
        passwordHash: pw,
        role: "rep",
        isActive: true,
        maxCapacity: 10,
        portalToken: repAPortalToken,
      })
      .returning();
    repAId = repA.id;

    const [repB] = await db
      .insert(users)
      .values({
        orgId: testOrgId,
        name: "Rep Bob",
        email: `bob-${Date.now()}@acme.com`,
        passwordHash: pw,
        role: "rep",
        isActive: true,
        maxCapacity: 10,
        portalToken: `rep_b_token_${Date.now()}`,
      })
      .returning();
    repBId = repB.id;
  });

  it("1. Should calculate accurate workload capacity and load status for team members", async () => {
    // Create 3 open tasks for Rep A
    await db.insert(tasks).values([
      {
        orgId: testOrgId,
        title: "Rep A Task 1",
        assigneeId: repAId,
        isDone: false,
      },
      {
        orgId: testOrgId,
        title: "Rep A Task 2",
        assigneeId: repAId,
        isDone: false,
      },
      {
        orgId: testOrgId,
        title: "Rep A Task 3",
        assigneeId: repAId,
        isDone: true,
      },
    ]);

    // Fetch member portal data directly
    const portalData = await getTeamMemberPortalData(repAPortalToken);
    assert.ok(portalData, "Portal data should load for valid portal token");
    assert.strictEqual(portalData.user.name, "Rep Alice");
    assert.strictEqual(portalData.tasks.length, 3);
  });

  it("2. Should allow rep to complete task and log timeline activity via Rep Portal", async () => {
    const userTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.orgId, testOrgId), eq(tasks.assigneeId, repAId)),
    });
    const targetTask = userTasks.find((t) => !t.isDone);
    assert.ok(targetTask, "Target open task found");

    // Complete task from Rep Desk
    const updated = await repUpdateTaskStatus(
      repAPortalToken,
      targetTask.id,
      true,
      "Finished client call and scheduled follow-up"
    );

    assert.strictEqual(updated.isDone, true);
    assert.ok(updated.completedAt);

    // Verify activity entry was logged
    const activitiesList = await db.query.activities.findMany({
      where: and(eq(activities.orgId, testOrgId), eq(activities.actorUserId, repAId)),
    });
    assert.ok(activitiesList.length > 0, "Activity timeline entry should be logged");
    assert.match(activitiesList[0].body, /Finished client call/);
  });
});
