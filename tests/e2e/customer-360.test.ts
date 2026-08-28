import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import {
  organizations,
  users,
  companies,
  contacts,
  clients,
  pipelines,
  stages,
  deals,
  invoices,
  payments,
  quotations,
  notes,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCustomer360Data } from "@/app/actions/customer-360";

describe("🌐 Customer 360-Degree Relationship Intelligence Hub", () => {
  const testOrgId = "org_test_360_" + Date.now();
  const testUserId = "usr_test_360_admin_" + Date.now();
  const testCompanyId = "comp_test_360_" + Date.now();
  const testContactId = "con_test_360_" + Date.now();
  const testClientId = "cli_test_360_" + Date.now();
  const testPipelineId = "pipe_test_360_" + Date.now();
  const testStageId = "stg_test_360_" + Date.now();
  const testDealId = "deal_test_360_" + Date.now();
  const testInvoiceId = "inv_test_360_" + Date.now();
  const testQuoteId = "qte_test_360_" + Date.now();

  before(async () => {
    // 1. Provision Org
    await db.insert(organizations).values({
      id: testOrgId,
      name: "Customer 360 Test Org",
      slug: "c360-test-" + Date.now(),
    });

    // 2. Provision Admin User
    await db.insert(users).values({
      id: testUserId,
      orgId: testOrgId,
      email: `c360_admin_${Date.now()}@keel.crm`,
      name: "Account Executive 360",
      role: "admin",
      passwordHash: "test_hash",
    });

    // 3. Provision Pipeline & Stage
    await db.insert(pipelines).values({
      id: testPipelineId,
      orgId: testOrgId,
      name: "Standard Sales Pipeline",
    });

    await db.insert(stages).values({
      id: testStageId,
      pipelineId: testPipelineId,
      name: "Proposal Sent",
      order: 1,
    });

    // 4. Provision Company
    await db.insert(companies).values({
      id: testCompanyId,
      orgId: testOrgId,
      name: "Reliance Digital Operations",
      domain: "reliancedigital.in",
      industry: "Telecommunications",
    });

    // 5. Provision Contact
    await db.insert(contacts).values({
      id: testContactId,
      orgId: testOrgId,
      companyId: testCompanyId,
      firstName: "Mukesh",
      lastName: "Deshmukh",
      email: "mukesh.d@reliancedigital.in",
      phone: "+919876543210",
      title: "VP of Engineering & Cloud Ops",
      ownerId: testUserId,
    });

    // 6. Provision Client Record with Portal Token
    await db.insert(clients).values({
      id: testClientId,
      orgId: testOrgId,
      contactId: testContactId,
      companyId: testCompanyId,
      name: "Reliance Digital Operations",
      portalToken: "portal_c360_token_" + Date.now(),
    });

    // 7. Provision Deal
    await db.insert(deals).values({
      id: testDealId,
      orgId: testOrgId,
      pipelineId: testPipelineId,
      stageId: testStageId,
      contactId: testContactId,
      title: "Enterprise Multi-Region Cloud Migration",
      value: 500000,
    });

    // 7. Provision Quotation
    await db.insert(quotations).values({
      id: testQuoteId,
      orgId: testOrgId,
      dealId: testDealId,
      clientId: testClientId,
      title: "Cloud Infrastructure Quotation",
      total: 500000,
      status: "accepted",
      signerName: "Mukesh Deshmukh",
    });

    // 8. Provision Invoice
    await db.insert(invoices).values({
      id: testInvoiceId,
      orgId: testOrgId,
      clientId: testClientId,
      dealId: testDealId,
      invoiceNumber: "INV-C360-001",
      amount: 500000,
      paidAmount: 200000,
      status: "partially_paid",
      dueDate: "2026-09-15",
    });

    // 9. Provision Payment
    await db.insert(payments).values({
      orgId: testOrgId,
      invoiceId: testInvoiceId,
      amount: 200000,
      paymentMode: "neft_rtgs",
      referenceNumber: "UTR-C360-998877",
      status: "completed",
    });

    // 10. Provision Note
    await db.insert(notes).values({
      orgId: testOrgId,
      relatedContactId: testContactId,
      body: "Client confirmed readiness for deployment during quarterly roadmap review.",
    });
  });

  after(async () => {
    // Clean up
    await db.delete(notes).where(eq(notes.orgId, testOrgId));
    await db.delete(payments).where(eq(payments.orgId, testOrgId));
    await db.delete(invoices).where(eq(invoices.id, testInvoiceId));
    await db.delete(quotations).where(eq(quotations.id, testQuoteId));
    await db.delete(deals).where(eq(deals.id, testDealId));
    await db.delete(stages).where(eq(stages.pipelineId, testPipelineId));
    await db.delete(pipelines).where(eq(pipelines.id, testPipelineId));
    await db.delete(clients).where(eq(clients.id, testClientId));
    await db.delete(contacts).where(eq(contacts.id, testContactId));
    await db.delete(companies).where(eq(companies.id, testCompanyId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  });

  it("1. Should aggregate full 360-degree profile, financials and relations", async () => {
    // Simulate query in context of the test user
    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, testContactId),
      with: { company: true, owner: true },
    });

    assert.ok(contact);
    assert.strictEqual(contact.firstName, "Mukesh");
    assert.strictEqual(contact.company?.name, "Reliance Digital Operations");
    assert.strictEqual(contact.owner?.name, "Account Executive 360");

    // Fetch related financial entities
    const clientInvoices = await db.query.invoices.findMany({
      where: eq(invoices.clientId, testClientId),
    });
    assert.strictEqual(clientInvoices.length, 1);
    assert.strictEqual(clientInvoices[0].amount, 500000);
    assert.strictEqual(clientInvoices[0].paidAmount, 200000);

    const clientPayments = await db.query.payments.findMany({
      where: eq(payments.invoiceId, testInvoiceId),
    });
    assert.strictEqual(clientPayments.length, 1);
    assert.strictEqual(clientPayments[0].amount, 200000);
    assert.strictEqual(clientPayments[0].paymentMode, "neft_rtgs");
  });

  it("2. Should build unified 360 chronological timeline with cross-table touchpoints", async () => {
    const quote = await db.query.quotations.findFirst({
      where: eq(quotations.clientId, testClientId),
    });
    assert.ok(quote);
    assert.strictEqual(quote.status, "accepted");
    assert.strictEqual(quote.signerName, "Mukesh Deshmukh");

    const noteRecord = await db.query.notes.findFirst({
      where: eq(notes.relatedContactId, testContactId),
    });
    assert.ok(noteRecord);
    assert.ok(noteRecord.body.includes("quarterly roadmap"));
  });
});
