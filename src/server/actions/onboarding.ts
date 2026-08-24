"use server";

import { db } from "@/db";
import { organizations, orgWidgets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDefaultWidgetsForType } from "@/lib/widgets/defaults";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function completeOnboarding(
  orgId: string,
  businessType: string,
  answers: Record<string, string>
) {
  let targetOrgId = orgId;
  if (!targetOrgId) {
    const session = await auth();
    if (session?.user?.orgId) {
      targetOrgId = session.user.orgId;
    }
  }

  if (!targetOrgId) {
    throw new Error("No organization ID found");
  }

  // 1. Update org with businessType and mark onboarding complete
  await db
    .update(organizations)
    .set({
      businessType,
      onboardingCompleted: true,
    })
    .where(eq(organizations.id, targetOrgId));

  // 2. Get default widgets for this business type
  const widgetKeys = getDefaultWidgetsForType(businessType);

  // 3. Insert enabled widgets (idempotent — skip if org already has widgets)
  const existing = await db.query.orgWidgets?.findMany?.({
    where: eq(orgWidgets.orgId, targetOrgId),
  }) ?? [];

  if (existing.length === 0) {
    await db.insert(orgWidgets).values(
      widgetKeys.map((key, idx) => ({
        orgId: targetOrgId,
        widgetKey: key,
        isEnabled: true,
        position: idx,
        config: {},
      }))
    );
  }

  try {
    revalidatePath("/dashboard");
  } catch (_ignored) {}

  return { success: true, widgetCount: widgetKeys.length };
}
