"use server";

import { auth } from "@/lib/auth";
import { getTenantSubscription, createCheckoutSession, PlanKey } from "@/lib/billing";
import { revalidatePath } from "next/cache";

export async function getBillingData() {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("Unauthorized: Session or organization missing.");
  }

  return getTenantSubscription(session.user.orgId);
}

export async function startPlanCheckout(planKey: PlanKey, isAnnual: boolean = false) {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("Unauthorized: Session or organization missing.");
  }

  const result = await createCheckoutSession(
    session.user.orgId,
    planKey,
    isAnnual,
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/billing`
  );

  revalidatePath("/dashboard/billing");
  return result;
}
