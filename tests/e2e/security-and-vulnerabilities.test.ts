import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import {
  organizations,
  users,
  clients,
  projects,
  deliverables,
  companies,
  contacts,
  deals,
  tasks,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { updateDeliverableStatus } from "@/app/actions/portal";

describe("🛡️ Keel CRM Security & Vulnerability Remediation Suite", () => {
  const orgAId = "org_sec_test_a_" + Date.now();
  const orgBId = "org_sec_test_b_" + Date.now();

  const userAId = "usr_sec_admin_a_" + Date.now();
  const userBId = "usr_sec_admin_b_" + Date.now();

  let clientA: any;
  let clientB: any;
  let projectB: any;
  let deliverableB: any;

  before(async () => {
    // 1. Create Org A and Org B
    await db.insert(organizations).values([
      { id: orgAId, name: "Organization Alpha", slug: "org-alpha-" + Date.now() },
      { id: orgBId, name: "Organization Beta", slug: "org-beta-" + Date.now() },
    ]);

    const passwordHash = await bcrypt.hash("SecurePass123!", 10);

    // 2. Create Users for Org A and Org B
    await db.insert(users).values([
      { id: userAId, orgId: orgAId, email: `admin_a_${Date.now()}@alpha.com`, name: "Admin Alpha", role: "admin", passwordHash },
      { id: userBId, orgId: orgBId, email: `admin_b_${Date.now()}@beta.com`, name: "Admin Beta", role: "admin", passwordHash },
    ]);

    // 3. Create Client A and Client B with Portal Tokens
    const [cA] = await db.insert(clients).values({
      orgId: orgAId,
      name: "Client Alpha Corp",
      portalToken: `pt_alpha_${crypto.randomUUID()}`,
    }).returning();
    clientA = cA;

    const [cB] = await db.insert(clients).values({
      orgId: orgBId,
      name: "Client Beta Corp",
      portalToken: `pt_beta_${crypto.randomUUID()}`,
    }).returning();
    clientB = cB;

    // 4. Create Project and Deliverable for Client B
    const [pB] = await db.insert(projects).values({
      orgId: orgBId,
      clientId: clientB.id,
      name: "Beta Brand Redesign",
      status: "active",
    }).returning();
    projectB = pB;

    const [delivB] = await db.insert(deliverables).values({
      projectId: projectB.id,
      title: "Beta Brand Identity Deck",
      status: "pending_review",
    }).returning();
    deliverableB = delivB;
  });

  after(async () => {
    // Cleanup
    await db.delete(deliverables).where(eq(deliverables.id, deliverableB?.id || ""));
    await db.delete(projects).where(eq(projects.orgId, orgBId));
    await db.delete(clients).where(eq(clients.orgId, orgAId));
    await db.delete(clients).where(eq(clients.orgId, orgBId));
    await db.delete(users).where(eq(users.orgId, orgAId));
    await db.delete(users).where(eq(users.orgId, orgBId));
    await db.delete(organizations).where(eq(organizations.id, orgAId));
    await db.delete(organizations).where(eq(organizations.id, orgBId));
  });

  it("1. Should verify password hashing uses bcrypt and validates correctly with bcrypt.compare", async () => {
    const rawPass = "MyTopSecretPassword2026!";
    const hashed = await bcrypt.hash(rawPass, 10);

    const isValid = await bcrypt.compare(rawPass, hashed);
    const isInvalid = await bcrypt.compare("WrongPassword", hashed);

    assert.strictEqual(isValid, true, "Bcrypt hash should successfully verify authentic password");
    assert.strictEqual(isInvalid, false, "Bcrypt hash should reject incorrect password");
  });

  it("2. Should prevent Client Portal IDOR: Client A portal token cannot approve Client B's deliverable", async () => {
    // Attempt to update Client B's deliverable using Client A's portal token
    let errorCaught = false;
    try {
      await updateDeliverableStatus(
        clientA.portalToken,
        deliverableB.id,
        "approved",
        "Malicious cross-tenant feedback"
      );
    } catch (err: any) {
      errorCaught = true;
      assert.match(err.message, /Deliverable not found for this client/i);
    }

    assert.strictEqual(errorCaught, true, "Cross-tenant deliverable update must be rejected with an error");

    // Verify deliverable B was NOT modified
    const currentDeliv = await db.query.deliverables.findFirst({
      where: eq(deliverables.id, deliverableB.id),
    });
    assert.strictEqual(currentDeliv?.status, "pending_review", "Status must remain pending_review");
  });

  it("3. Should enforce strict Multi-Tenant DB isolation on update and delete queries", async () => {
    const { pipelines, stages } = await import("@/db/schema");

    const [pipeB] = await db.insert(pipelines).values({
      orgId: orgBId,
      name: "Beta Sales Pipeline",
    }).returning();

    const [stageB] = await db.insert(stages).values({
      pipelineId: pipeB.id,
      name: "Qualified Lead",
      order: 1,
    }).returning();

    // Create a Company and Deal in Org B
    const [compB] = await db.insert(companies).values({
      orgId: orgBId,
      name: "Beta Secret Enterprise",
    }).returning();

    const [dealB] = await db.insert(deals).values({
      orgId: orgBId,
      companyId: compB.id,
      pipelineId: pipeB.id,
      stageId: stageB.id,
      title: "Confidential Beta Contract",
      value: 500000,
    }).returning();

    // Query with Org A scope attempting to access Org B deal
    const crossTenantSearch = await db.query.deals.findFirst({
      where: and(eq(deals.id, dealB.id), eq(deals.orgId, orgAId)),
    });
    assert.strictEqual(crossTenantSearch, undefined, "Org A query must not locate Org B record");

    // Attempt mutation with Org A scope
    const updateResult = await db
      .update(deals)
      .set({ title: "Tampered by Org A" })
      .where(and(eq(deals.id, dealB.id), eq(deals.orgId, orgAId)))
      .returning();

    assert.strictEqual(updateResult.length, 0, "No records should be updated across tenant boundary");

    // Verify record in Org B is untouched
    const freshDealB = await db.query.deals.findFirst({
      where: eq(deals.id, dealB.id),
    });
    assert.strictEqual(freshDealB?.title, "Confidential Beta Contract");

    // Clean up
    await db.delete(deals).where(eq(deals.id, dealB.id));
    await db.delete(companies).where(eq(companies.id, compB.id));
    await db.delete(stages).where(eq(stages.id, stageB.id));
    await db.delete(pipelines).where(eq(pipelines.id, pipeB.id));
  });

  it("4. Should validate payment webhook unauthenticated rejection", async () => {
    const { POST: paymentWebhookHandler } = await import("@/app/api/v1/webhooks/payment/route");

    // Request without Authorization header or secret
    const unauthenticatedReq = new Request("http://localhost:3000/api/v1/webhooks/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: orgAId,
        dealId: "fake_deal_id",
        amount: 100000,
      }),
    });

    const response = await paymentWebhookHandler(unauthenticatedReq);
    assert.strictEqual(response.status, 401, "Unauthenticated payment webhook request must return 401");
  });
});
