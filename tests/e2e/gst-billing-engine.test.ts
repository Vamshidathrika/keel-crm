import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import {
  organizations,
  users,
  gstSettings,
  invoiceCustomizations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  validateGSTIN,
  calculateGstBreakup,
  generateUpiPaymentString,
  INDIAN_STATES,
} from "@/lib/gst-engine";

describe("🇮🇳 Keel Statutory Indian GST & Billing Customization Engine", () => {
  const testOrgId = "org_test_gst_engine_" + Date.now();
  const testUserId = "usr_test_gst_admin_" + Date.now();

  before(async () => {
    // Setup test organization & admin user
    await db.insert(organizations).values({
      id: testOrgId,
      name: "Keel Enterprise Technologies",
      slug: "keel-gst-test-" + Date.now(),
    });

    await db.insert(users).values({
      id: testUserId,
      orgId: testOrgId,
      email: `gst_admin_${Date.now()}@keel.crm`,
      name: "GST Compliance Admin",
      role: "admin",
      passwordHash: "hashed_pass_test",
    });
  });

  after(async () => {
    // Clean up
    await db.delete(invoiceCustomizations).where(eq(invoiceCustomizations.orgId, testOrgId));
    await db.delete(gstSettings).where(eq(gstSettings.orgId, testOrgId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  });

  it("1. Should validate GSTIN format and parse State Code + PAN", () => {
    // Valid Telangana GSTIN
    const validTelangana = validateGSTIN("36AAECK1234F1Z5");
    assert.strictEqual(validTelangana.isValid, true);
    assert.strictEqual(validTelangana.stateCode, "36");
    assert.strictEqual(validTelangana.pan, "AAECK1234F");

    // Valid Maharashtra GSTIN
    const validMaharashtra = validateGSTIN("27AABCR1234K1Z2");
    assert.strictEqual(validMaharashtra.isValid, true);
    assert.strictEqual(validMaharashtra.stateCode, "27");

    // Invalid GSTIN (Bad format / Length)
    const invalidFormat = validateGSTIN("36INVALID123");
    assert.strictEqual(invalidFormat.isValid, false);
    assert.ok(invalidFormat.error);
  });

  it("2. Should automatically compute Intra-State CGST (9%) + SGST (9%) tax split", () => {
    const items = [
      { name: "Cloud CRM License", qty: 2, unitPrice: 50000, taxPercent: 18, hsnSac: "998313" },
      { name: "Implementation Onboarding", qty: 1, unitPrice: 20000, taxPercent: 18, hsnSac: "998311" },
    ];

    // Supplier: Telangana [36], Place of Supply: Telangana [36] ➔ Intra-State
    const result = calculateGstBreakup(items, "36", "36");

    assert.strictEqual(result.taxType, "intra_state");
    assert.strictEqual(result.taxableAmount, 120000);
    assert.strictEqual(result.cgstAmount, 10800); // 9% of 120000
    assert.strictEqual(result.sgstAmount, 10800); // 9% of 120000
    assert.strictEqual(result.igstAmount, 0);
    assert.strictEqual(result.totalTax, 21600); // 18% of 120000
    assert.strictEqual(result.grandTotal, 141600);
    assert.strictEqual(result.hsnSummary.length, 2);
  });

  it("3. Should automatically compute Inter-State IGST (18%) tax treatment", () => {
    const items = [
      { name: "Enterprise Dedicated Server", qty: 1, unitPrice: 200000, taxPercent: 18, hsnSac: "847130" },
    ];

    // Supplier: Telangana [36], Place of Supply: Karnataka [29] ➔ Inter-State
    const result = calculateGstBreakup(items, "36", "29");

    assert.strictEqual(result.taxType, "inter_state");
    assert.strictEqual(result.taxableAmount, 200000);
    assert.strictEqual(result.cgstAmount, 0);
    assert.strictEqual(result.sgstAmount, 0);
    assert.strictEqual(result.igstAmount, 36000); // 18% of 200000
    assert.strictEqual(result.totalTax, 36000);
    assert.strictEqual(result.grandTotal, 236000);
  });

  it("4. Should generate compliant NPCI UPI payment intent URI", () => {
    const upiUri = generateUpiPaymentString({
      upiId: "keelpay@okhdfcbank",
      payeeName: "Keel Technologies",
      amount: 141600,
      invoiceNumber: "INV-2026-9901",
    });

    assert.ok(upiUri.startsWith("upi://pay?pa=keelpay@okhdfcbank"));
    assert.ok(upiUri.includes("am=141600.00"));
    assert.ok(upiUri.includes("cu=INR"));
  });

  it("5. Should persist GST profile and invoice template customization in database", async () => {
    // 1. Create GST Settings
    const [gst] = await db
      .insert(gstSettings)
      .values({
        orgId: testOrgId,
        gstin: "36AAECK1234F1Z5",
        legalName: "Keel Enterprise Technologies Ltd",
        tradeName: "Keel CRM",
        pan: "AAECK1234F",
        stateCode: "36",
        stateName: "Telangana",
        bankName: "HDFC Bank Ltd",
        accountNumber: "50200099887766",
        ifscCode: "HDFC0001234",
        upiId: "keeltech@okhdfcbank",
      })
      .returning();

    assert.strictEqual(gst.gstin, "36AAECK1234F1Z5");
    assert.strictEqual(gst.stateCode, "36");

    // 2. Create Invoice Customization
    const [invCustom] = await db
      .insert(invoiceCustomizations)
      .values({
        orgId: testOrgId,
        templateTheme: "enterprise_dark",
        primaryColor: "#0f172a",
        showTaxBreakup: true,
        showHsnSac: true,
        showBankDetails: true,
        showUpiQr: true,
        footerNote: "Special partnership terms applied.",
      })
      .returning();

    assert.strictEqual(invCustom.templateTheme, "enterprise_dark");
    assert.strictEqual(invCustom.showTaxBreakup, true);
    assert.strictEqual(invCustom.showUpiQr, true);
  });
});
