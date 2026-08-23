import React from "react";
import { db } from "@/db";
import { deals, contacts, activities, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, sql } from "drizzle-orm";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { orgId } = session.user;

  // 1. Fetch Funnel Stage Data
  const stagesDb = await db.query.stages.findMany({
    with: {
      pipeline: true,
    },
  });

  const dealsDb = await db.query.deals.findMany({
    where: eq(deals.orgId, orgId),
    with: {
      stage: true,
      owner: true,
    },
  });

  // Group deal values by stage
  const funnelData = stagesDb
    .filter((st) => (st as any).pipeline?.isDefault)
    .map((st) => {
      const stageDeals = dealsDb.filter((d) => d.stageId === st.id);
      const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
      return {
        stageName: st.name,
        value: totalValue,
        color: st.color,
      };
    })
    .sort((a, b) => {
      // Find stage orders to sort
      const stA = stagesDb.find((st) => st.name === a.stageName);
      const stB = stagesDb.find((st) => st.name === b.stageName);
      return (stA?.order || 0) - (stB?.order || 0);
    });

  // 2. Forecast Data (weighted value grouped by close month)
  const forecastMap: Record<string, number> = {};
  for (const d of dealsDb) {
    const dAny = d as any;
    if (!dAny.expectedCloseDate) continue;
    const month = dAny.expectedCloseDate.slice(0, 7); // YYYY-MM
    const isClosed = dAny.stage?.type === "won" || dAny.stage?.type === "lost";
    if (dAny.stage?.type === "lost") continue;
    const weight = dAny.stage?.type === "won" ? 1.0 : dAny.probability / 100;
    const weightedVal = dAny.value * weight;

    forecastMap[month] = (forecastMap[month] || 0) + weightedVal;
  }

  const forecastData = Object.entries(forecastMap)
    .map(([month, value]) => ({ month, value }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(0, 6); // Show next 6 months

  // 3. Sales Leaderboard (sum won deal value by owner)
  const leaderboardMap: Record<string, number> = {};
  for (const d of dealsDb) {
    const dAny = d as any;
    if (dAny.stage?.type !== "won" || !dAny.owner) continue;
    const repName = dAny.owner.name;
    leaderboardMap[repName] = (leaderboardMap[repName] || 0) + dAny.value;
  }

  const leaderboardData = Object.entries(leaderboardMap)
    .map(([repName, value]) => ({ name: repName, value }))
    .sort((a, b) => b.value - a.value);

  // 4. Hot Leads (score >= 75)
  const hotLeads = await db.query.contacts.findMany({
    where: and(eq(contacts.orgId, orgId), sql`${contacts.score} >= 75`),
    limit: 5,
    orderBy: [desc(contacts.score)],
  });

  // 5. Recent timeline activities
  const recentActivities = await db.query.activities.findMany({
    where: eq(activities.orgId, orgId),
    limit: 5,
    orderBy: [desc(activities.occurredAt)],
    with: {
      actorUserId: {
        columns: {
          name: true,
        },
      },
    },
  });

  // Load enabled widget keys and business type
  const { getEnabledWidgetKeys } = await import("@/server/actions/widgets");
  const { getOrgDetails } = await import("@/server/actions/branding");
  const enabledWidgetKeys = await getEnabledWidgetKeys();
  const orgDetails = await getOrgDetails();

  return (
    <DashboardClient
      funnelData={funnelData}
      forecastData={forecastData}
      leaderboardData={leaderboardData}
      hotLeads={hotLeads}
      recentActivities={recentActivities}
      deals={dealsDb as any}
      stages={stagesDb as any}
      enabledWidgetKeys={enabledWidgetKeys}
      businessType={orgDetails?.businessType || "logistics"}
    />
  );
}
