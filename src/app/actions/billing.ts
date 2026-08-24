"use server";

import { auth } from "@/lib/auth";
import { getTenantSubscription, createCheckoutSession, PlanKey } from "@/lib/billing";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function resolveOrgId(session: any): Promise<string | null> {
  if (session?.user?.orgId) return session.user.orgId;
  if (session?.user?.id) {
    const userDb = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });
    return userDb?.orgId || null;
  }
  return null;
}

export async function getBillingData() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: Please sign in.");
  }

  const orgId = await resolveOrgId(session);
  if (!orgId) {
    throw new Error("Unauthorized: Organization not associated with this account.");
  }

  return getTenantSubscription(orgId);
}

export async function startPlanCheckout(planKey: PlanKey, isAnnual: boolean = false) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: Please sign in to manage billing.");
  }

  const orgId = await resolveOrgId(session);
  if (!orgId) {
    throw new Error("Unauthorized: Organization not associated with this account.");
  }

  const result = await createCheckoutSession(
    orgId,
    planKey,
    isAnnual,
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/billing`
  );

  revalidatePath("/dashboard/billing");
  return result;
}
