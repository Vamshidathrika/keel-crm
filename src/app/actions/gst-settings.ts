"use server";

import { db } from "@/db";
import { gstSettings, organizations, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { validateGSTIN, INDIAN_STATES, GstCalculationResult, calculateGstBreakup, LineItemForGst } from "@/lib/gst-engine";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getGstSettings() {
  const session = await auth();
  if (!session?.user) return null;

  const { orgId } = session.user;
  let settings = await db.query.gstSettings.findFirst({
    where: eq(gstSettings.orgId, orgId),
  });

  if (!settings) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    const [created] = await db
      .insert(gstSettings)
      .values({
        orgId,
        legalName: org?.name || "Keel Enterprise Ltd",
        tradeName: org?.name || "Keel Enterprise",
        stateCode: "36",
        stateName: "Telangana",
        bankName: "HDFC Bank",
        accountHolderName: org?.name || "Keel Enterprise",
        accountNumber: "50200012345678",
        ifscCode: "HDFC0001234",
        upiId: "keel@okhdfcbank",
      })
      .returning();

    return created;
  }

  return settings;
}

export async function updateGstSettings(data: {
  gstin?: string;
  legalName?: string;
  tradeName?: string;
  stateCode?: string;
  stateName?: string;
  isCompositionScheme?: boolean;
  isRcmApplicable?: boolean;
  lutNumber?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  upiId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, role } = session.user;
  if (role === "rep") throw new Error("Access Denied: Only Admins and Managers can update GST settings.");

  let pan = "";
  let resolvedStateName = data.stateName;

  if (data.gstin && data.gstin.trim()) {
    const val = validateGSTIN(data.gstin);
    if (!val.isValid) {
      throw new Error(val.error || "Invalid GSTIN format.");
    }
    pan = val.pan || "";
    if (val.stateCode) {
      const st = INDIAN_STATES.find((s) => s.code === val.stateCode);
      if (st) resolvedStateName = st.name;
    }
  }

  const existing = await db.query.gstSettings.findFirst({
    where: eq(gstSettings.orgId, orgId),
  });

  let result;
  if (existing) {
    [result] = await db
      .update(gstSettings)
      .set({
        ...data,
        pan: pan || existing.pan,
        stateName: resolvedStateName || existing.stateName,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(gstSettings.orgId, orgId))
      .returning();
  } else {
    [result] = await db
      .insert(gstSettings)
      .values({
        orgId,
        ...data,
        pan,
        stateName: resolvedStateName || "Telangana",
      })
      .returning();
  }

  await db.insert(activities).values({
    orgId,
    type: "system",
    body: `Updated GST & Tax Compliance profile. GSTIN: ${data.gstin || "N/A"}, State: ${resolvedStateName || "Telangana"}.`,
    source: "manual",
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/billing");
  return result;
}

export async function calculateInvoiceTaxes(params: {
  items: LineItemForGst[];
  buyerStateCode?: string;
  buyerGstin?: string;
}): Promise<GstCalculationResult> {
  const session = await auth();
  const orgId = session?.user?.orgId;

  let supplierState = "36";
  if (orgId) {
    const settings = await db.query.gstSettings.findFirst({
      where: eq(gstSettings.orgId, orgId),
    });
    if (settings?.stateCode) supplierState = settings.stateCode;
  }

  let placeOfSupply = params.buyerStateCode || "36";
  if (params.buyerGstin) {
    const val = validateGSTIN(params.buyerGstin);
    if (val.isValid && val.stateCode) placeOfSupply = val.stateCode;
  }

  return calculateGstBreakup(params.items, supplierState, placeOfSupply);
}
