import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, deals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runDealDoctorAgent } from "@/lib/agents/deal-doctor";
import { runGuardianAgent } from "@/lib/agents/guardian";
import { runBriefingAgent } from "@/lib/agents/briefing";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Verify secret if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgs = await db.query.organizations.findMany();
    let totalDealsProcessed = 0;

    for (const org of orgs) {
      const openDeals = await db.query.deals.findMany({
        where: eq(deals.orgId, org.id),
      });

      for (const deal of openDeals) {
        await runDealDoctorAgent(org.id, deal.id, "sweep");
        totalDealsProcessed++;
      }

      await runGuardianAgent(org.id, org.id, "sweep");
      await runBriefingAgent(org.id);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      organizationsScanned: orgs.length,
      dealsAudited: totalDealsProcessed,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Sweep failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
