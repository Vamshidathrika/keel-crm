"use server";

import { db } from "@/db";
import { invoiceCustomizations, organizations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getInvoiceCustomization() {
  const session = await auth();
  if (!session?.user) return null;

  const { orgId } = session.user;
  let custom = await db.query.invoiceCustomizations.findFirst({
    where: eq(invoiceCustomizations.orgId, orgId),
  });

  if (!custom) {
    const [created] = await db
      .insert(invoiceCustomizations)
      .values({
        orgId,
        templateTheme: "modern_slate",
        primaryColor: "#3b82f6",
        showTaxBreakup: true,
        showHsnSac: true,
        showBankDetails: true,
        showUpiQr: true,
      })
      .returning();
    return created;
  }

  return custom;
}

export async function updateInvoiceCustomization(data: {
  templateTheme?: "modern_slate" | "classic_navy" | "minimalist_emerald" | "enterprise_dark";
  primaryColor?: string;
  companyLogoUrl?: string;
  showTaxBreakup?: boolean;
  showHsnSac?: boolean;
  showBankDetails?: boolean;
  showUpiQr?: boolean;
  termsAndConditions?: string;
  declarationText?: string;
  footerNote?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, role } = session.user;
  if (role === "rep") throw new Error("Access Denied: Only Admins and Managers can customize invoices.");

  const existing = await db.query.invoiceCustomizations.findFirst({
    where: eq(invoiceCustomizations.orgId, orgId),
  });

  let result;
  if (existing) {
    [result] = await db
      .update(invoiceCustomizations)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(invoiceCustomizations.orgId, orgId))
      .returning();
  } else {
    [result] = await db
      .insert(invoiceCustomizations)
      .values({
        orgId,
        ...data,
      })
      .returning();
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/quotes");
  return result;
}
