import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth";
import { getTenantSubscription, createCheckoutSession, PRICING_PLANS, PlanKey } from "@/lib/billing";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "billing:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;
  const billingData = await getTenantSubscription(orgId);

  return NextResponse.json({
    data: {
      ...billingData,
      availablePlans: Object.values(PRICING_PLANS),
    },
  });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "billing:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { plan, isAnnual = false } = body;

    if (!plan || !["starter", "growth", "enterprise"].includes(plan)) {
      return NextResponse.json(
        { error: "Field 'plan' is required and must be one of: 'starter', 'growth', 'enterprise'." },
        { status: 400 }
      );
    }

    const orgId = authResult.orgId!;
    const checkoutResult = await createCheckoutSession(orgId, plan as PlanKey, isAnnual);

    return NextResponse.json({ data: checkoutResult }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process subscription change" }, { status: 500 });
  }
}
