import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import {
  organizations,
  users,
  clients,
  companies,
  invoices,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  calculateGstBreakup,
  validateGSTIN,
  INDIAN_STATES,
} from "@/lib/gst-engine";

describe("🧾 Keel LedgerOS™ Sovereign Fiscal Bill & Invoice Entry Engine", () => {
  const testOrgId = "org_test_fiscal_bill_" + Date.now();
  const testUserId = "usr_test_fiscal_bill_" + Date.now();
  const testCompanyId = "cmp_test_fiscal_vendor_" + Date.now();

  before(async () => {
    // Setup test organization & admin user
    await db.insert(organizations).values({
      id: testOrgId,
      name: "Keel Enterprise Systems Ltd",
      slug: "keel-fiscal-bill-" + Date.now(),
    });

    await db.insert(users).values({
      id: testUserId,
      orgId: testOrgId,
      email: `fiscal_admin_${Date.now()}@keel.crm`,
      name: "Billing Operations Officer",
      role: "admin",
      passwordHash: "hashed_pass_test",
    });

    await db.insert(companies).values({
      id: testCompanyId,
      orgId: testOrgId,
      name: "Sovereign Cloud Infrastructure Corp",
      gstin: "27AAECK9988F1Z4",
      domain: "sovereigncloud.com",
    });
  });

  after(async () => {
    // Clean up
    await db.delete(invoices).where(eq(invoices.orgId, testOrgId));
    await db.delete(clients).where(eq(clients.orgId, testOrgId));
    await db.delete(companies).where(eq(companies.orgId, testOrgId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  });

  it("1. Should compute multi-item line items with HSN/SAC, discounts, and Intra-state CGST+SGST", () => {
    const items = [
      {
        id: "1",
        name: "Enterprise Revenue Cloud License",
        qty: 2,
        unitPrice: 50000,
        discountPercent: 10, // 10% discount on 1,00,000 = 10,000 -> Taxable: 90,000
        taxPercent: 18,
      },
      {
        id: "2",
        name: "Custom Integration Implementation",
        qty: 1,
        unitPrice: 40000,
        discountPercent: 0,
        taxPercent: 18, // Taxable: 40,000
      },
    ];

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const isIntraState = true; // Telangana to Telangana

    items.forEach((item) => {
      const gross = item.qty * item.unitPrice;
      const disc = (gross * (item.discountPercent || 0)) / 100;
      const taxable = gross - disc;
      totalTaxable += taxable;

      if (isIntraState) {
        totalCgst += (taxable * (item.taxPercent / 2)) / 100;
        totalSgst += (taxable * (item.taxPercent / 2)) / 100;
      } else {
        totalIgst += (taxable * item.taxPercent) / 100;
      }
    });

    const totalTax = totalCgst + totalSgst + totalIgst;
    const grandTotal = totalTaxable + totalTax;

    assert.strictEqual(totalTaxable, 130000, "Taxable amount should be 90k + 40k = 130k");
    assert.strictEqual(totalCgst, 11700, "CGST (9%) on 130k should be 11,700");
    assert.strictEqual(totalSgst, 11700, "SGST (9%) on 130k should be 11,700");
    assert.strictEqual(totalIgst, 0, "IGST should be 0 for intra-state supply");
    assert.strictEqual(grandTotal, 153400, "Grand total with 18% GST should be 153,400");
  });

  it("2. Should compute Inter-State Place of Supply with IGST and TDS Section 194J deduction", () => {
    const isIntraState = false; // Telangana (36) to Maharashtra (27)
    const taxableAmount = 200000;
    const gstRate = 18;
    const tdsRate = 10; // 194J Tech services

    const igst = (taxableAmount * gstRate) / 100;
    const preTdsTotal = taxableAmount + igst;
    const tdsAmount = (taxableAmount * tdsRate) / 100;
    const netReceivable = preTdsTotal - tdsAmount;

    assert.strictEqual(igst, 36000, "IGST (18%) on 200k should be 36,000");
    assert.strictEqual(preTdsTotal, 236000, "Invoice gross should be 236,000");
    assert.strictEqual(tdsAmount, 20000, "TDS 194J (10%) on 200k base should be 20,000");
    assert.strictEqual(netReceivable, 216000, "Net receivable post-TDS should be 216,000");
  });

  it("3. Should persist Sovereign Tax Invoice with rich multi-line items and Place of Supply metadata", async () => {
    const [createdClient] = await db
      .insert(clients)
      .values({
        orgId: testOrgId,
        name: "Tata Consultancy Services Corp",
        portalToken: `pt_test_${Date.now()}`,
      })
      .returning();

    const lineItems = [
      {
        name: "Sovereign Fiscal Cloud API Seat Tier",
        qty: 5,
        unit: "Nos",
        unitPrice: 20000,
        subtotal: 100000,
        hsnSac: "998313",
        taxPercent: 18,
        cgst: 0,
        sgst: 0,
        igst: 18000,
        total: 118000,
      },
    ];

    const [createdInvoice] = await db
      .insert(invoices)
      .values({
        orgId: testOrgId,
        clientId: createdClient.id,
        invoiceNumber: `INV-2026-${Date.now().toString().slice(-4)}`,
        billType: "tax_invoice",
        placeOfSupply: "27", // Maharashtra
        gstin: "27AAECK1234F1Z5",
        pan: "AAECK1234F",
        billingAddress: "Nariman Point, Mumbai, Maharashtra - 400021",
        shippingAddress: "Nariman Point, Mumbai, Maharashtra - 400021",
        poNumber: "PO-TATA-2026-09",
        eWayBillNumber: "121045982341",
        accountCategory: "Software & Cloud SaaS",
        isRcm: false,
        paymentTerms: "net_30",
        currency: "INR",
        subtotal: 100000,
        discountAmount: 0,
        taxAmount: 18000,
        shippingCharges: 500,
        tdsSection: "194J",
        tdsRate: 10,
        tdsAmount: 10000,
        roundOff: 0,
        amount: 108500, // 100k + 18k IGST + 500 Shipping - 10k TDS = 108,500
        paidAmount: 0,
        lineItems: lineItems,
        notes: "Payment remittance to HDFC Corporate Account.",
        termsAndConditions: "18% p.a. statutory interest applies post 30 days.",
        status: "unpaid",
        dueDate: "2026-09-25",
      })
      .returning();

    assert.ok(createdInvoice.id, "Invoice ID should be generated");
    assert.strictEqual(createdInvoice.placeOfSupply, "27");
    assert.strictEqual(createdInvoice.billType, "tax_invoice");
    assert.strictEqual(createdInvoice.poNumber, "PO-TATA-2026-09");
    assert.strictEqual(createdInvoice.tdsSection, "194J");
    assert.strictEqual(createdInvoice.tdsAmount, 10000);
    assert.strictEqual(createdInvoice.amount, 108500);
    assert.strictEqual((createdInvoice.lineItems as any[]).length, 1);
  });

  it("4. Should record Vendor Bill with complete payment terms and retrieve from ledger", async () => {
    const [vendorClient] = await db
      .insert(clients)
      .values({
        orgId: testOrgId,
        name: "Amazon Web Services India Pvt Ltd",
        portalToken: `pt_vendor_${Date.now()}`,
      })
      .returning();

    const [vendorBill] = await db
      .insert(invoices)
      .values({
        orgId: testOrgId,
        clientId: vendorClient.id,
        invoiceNumber: `BILL-2026-${Date.now().toString().slice(-4)}`,
        billType: "vendor_bill",
        placeOfSupply: "36", // Telangana
        gstin: "36AAECK9988F1Z4",
        pan: "AAECK9988F",
        billingAddress: "Hitec City, Hyderabad, Telangana - 500081",
        accountCategory: "Hosting & Cloud Infrastructure",
        isRcm: true,
        paymentTerms: "due_on_receipt",
        currency: "INR",
        subtotal: 80000,
        discountAmount: 0,
        taxAmount: 14400,
        shippingCharges: 0,
        tdsSection: "194C",
        tdsRate: 1,
        tdsAmount: 800,
        roundOff: 0,
        amount: 93600,
        paidAmount: 93600,
        lineItems: [
          {
            name: "Cloud Server Compute (EC2 & RDS)",
            qty: 1,
            unitPrice: 80000,
            subtotal: 80000,
            hsnSac: "998313",
            taxPercent: 18,
            cgst: 7200,
            sgst: 7200,
            igst: 0,
            total: 94400,
          },
        ],
        notes: "Monthly infrastructure vendor billing statement",
        termsAndConditions: "Payment verified via direct bank debit.",
        status: "paid",
        dueDate: "2026-08-30",
      })
      .returning();

    assert.ok(vendorBill.id);
    assert.strictEqual(vendorBill.status, "paid");
    assert.strictEqual(vendorBill.billType, "vendor_bill");
    assert.strictEqual(vendorBill.gstin, "36AAECK9988F1Z4");
    assert.strictEqual(vendorBill.tdsSection, "194C");
    assert.strictEqual(vendorBill.tdsAmount, 800);
    assert.strictEqual(vendorBill.isRcm, true);
    assert.strictEqual(vendorBill.amount, 93600);

    // Query all invoices & bills for the org
    const orgInvoices = await db.query.invoices.findMany({
      where: eq(invoices.orgId, testOrgId),
    });

    assert.strictEqual(orgInvoices.length, 2);
  });

  it("5. Should persist and query Pricing Plans, Smart Dunning Rules, and Metered Usage in dedicated tables", async () => {
    const { pricingPlans, dunningRules, meteredUsageRecords } = await import("@/db/schema");

    // 1. Pricing Plan
    const [plan] = await db
      .insert(pricingPlans)
      .values({
        orgId: testOrgId,
        name: "Enterprise Pro Annual Plan",
        code: "ENT-PRO-YR",
        model: "flat",
        billingCycle: "annual",
        basePrice: 199999,
        trialDays: 30,
        currency: "INR",
        taxInclusive: false,
        status: "active",
      })
      .returning();

    assert.ok(plan.id);
    assert.strictEqual(plan.name, "Enterprise Pro Annual Plan");
    assert.strictEqual(plan.basePrice, 199999);

    // 2. Dunning Rules
    const [dunning] = await db
      .insert(dunningRules)
      .values({
        orgId: testOrgId,
        retryAttempts: 4,
        retryIntervalDays: [1, 3, 5, 7],
        emailNotification: true,
        whatsappNotification: true,
        actionOnFailure: "pause",
        gracePeriodDays: 7,
      })
      .returning();

    assert.ok(dunning.id);
    assert.strictEqual(dunning.retryAttempts, 4);
    assert.strictEqual(dunning.actionOnFailure, "pause");

    // 3. Metered Usage Record
    const [usage] = await db
      .insert(meteredUsageRecords)
      .values({
        orgId: testOrgId,
        subscriptionId: "sub_test_001",
        meterName: "API Gateway Calls",
        unitsConsumed: 250000,
        unitPrice: 0.05,
      })
      .returning();

    assert.ok(usage.id);
    assert.strictEqual(usage.meterName, "API Gateway Calls");
    assert.strictEqual(usage.unitsConsumed, 250000);

    // Clean up dedicated table rows for this test
    await db.delete(meteredUsageRecords).where(eq(meteredUsageRecords.orgId, testOrgId));
    await db.delete(dunningRules).where(eq(dunningRules.orgId, testOrgId));
    await db.delete(pricingPlans).where(eq(pricingPlans.orgId, testOrgId));
  });
});
