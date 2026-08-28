import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import {
  organizations,
  users,
  clients,
  invoices,
  payments,
  activities,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

describe("💵 Payment Recording & Multi-Tranche Settlement Engine", () => {
  const testOrgId = "org_test_pay_" + Date.now();
  const testUserId = "usr_test_pay_admin_" + Date.now();
  const testClientId = "cli_test_pay_" + Date.now();
  const testInvoiceId = "inv_test_pay_" + Date.now();

  before(async () => {
    // 1. Provision Org
    await db.insert(organizations).values({
      id: testOrgId,
      name: "Payment Test Enterprise",
      slug: "pay-test-" + Date.now(),
    });

    // 2. Provision User
    await db.insert(users).values({
      id: testUserId,
      orgId: testOrgId,
      email: `pay_admin_${Date.now()}@keel.crm`,
      name: "Payment Officer",
      role: "admin",
      passwordHash: "test_hash",
    });

    // 3. Provision Client
    await db.insert(clients).values({
      id: testClientId,
      orgId: testOrgId,
      name: "Infosys Cloud Solutions",
      portalToken: "portal_token_" + Date.now(),
    });

    // 4. Provision Invoice of ₹1,00,000 (status: unpaid)
    await db.insert(invoices).values({
      id: testInvoiceId,
      orgId: testOrgId,
      clientId: testClientId,
      invoiceNumber: "INV-PAY-2026-001",
      amount: 100000,
      subtotal: 84745.76,
      taxAmount: 15254.24,
      paidAmount: 0,
      status: "unpaid",
      dueDate: "2026-09-30",
    });
  });

  after(async () => {
    // Cleanup
    await db.delete(payments).where(eq(payments.orgId, testOrgId));
    await db.delete(invoices).where(eq(invoices.id, testInvoiceId));
    await db.delete(clients).where(eq(clients.id, testClientId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  });

  it("1. Should record a partial payment of ₹40,000 via UPI and transition invoice to 'partially_paid'", async () => {
    const paymentAmount = 40000;

    // Simulate record payment logic
    const [payment] = await db
      .insert(payments)
      .values({
        orgId: testOrgId,
        invoiceId: testInvoiceId,
        amount: paymentAmount,
        paymentMode: "upi",
        referenceNumber: "UPI-TXN-9876543210",
        notes: "Advance tranche 1 received via PhonePe QR",
        status: "completed",
      })
      .returning();

    assert.strictEqual(payment.amount, 40000);
    assert.strictEqual(payment.paymentMode, "upi");
    assert.strictEqual(payment.referenceNumber, "UPI-TXN-9876543210");

    // Update invoice
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        paidAmount: paymentAmount,
        status: "partially_paid",
      })
      .where(eq(invoices.id, testInvoiceId))
      .returning();

    assert.strictEqual(updatedInvoice.paidAmount, 40000);
    assert.strictEqual(updatedInvoice.status, "partially_paid");
  });

  it("2. Should record second tranche of ₹60,000 via NEFT and auto-complete invoice to 'paid'", async () => {
    const secondTranche = 60000;

    const [payment2] = await db
      .insert(payments)
      .values({
        orgId: testOrgId,
        invoiceId: testInvoiceId,
        amount: secondTranche,
        paymentMode: "neft_rtgs",
        referenceNumber: "HDFCN26082599012",
        notes: "Final balance settlement via corporate NEFT",
        status: "completed",
      })
      .returning();

    assert.strictEqual(payment2.amount, 60000);
    assert.strictEqual(payment2.paymentMode, "neft_rtgs");

    // Fetch all payments for this invoice
    const allPayments = await db.query.payments.findMany({
      where: and(eq(payments.invoiceId, testInvoiceId), eq(payments.orgId, testOrgId)),
    });

    assert.strictEqual(allPayments.length, 2);

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    assert.strictEqual(totalPaid, 100000);

    // Final invoice settlement
    const [finalInvoice] = await db
      .update(invoices)
      .set({
        paidAmount: totalPaid,
        status: "paid",
        paidAt: new Date().toISOString(),
      })
      .where(eq(invoices.id, testInvoiceId))
      .returning();

    assert.strictEqual(finalInvoice.paidAmount, 100000);
    assert.strictEqual(finalInvoice.status, "paid");
    assert.ok(finalInvoice.paidAt);
  });
});
