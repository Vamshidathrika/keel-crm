import React from "react";
import { db } from "@/db";
import { deals, contacts, activities, pipelines, stages } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, sql } from "drizzle-orm";
import DashboardClient from "./dashboard-client";
import { redirect } from "next/navigation";

import { getEnabledWidgetKeys } from "@/server/actions/widgets";
import { getOrgDetails } from "@/server/actions/branding";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { orgId } = session.user;

  try {
    // Parallelize all dashboard queries in a single Promise.all batch
    const [
      orgPipelines,
      dealsDb,
      hotLeads,
      recentActivities,
      enabledWidgetKeys,
      orgDetails,
    ] = await Promise.all([
      db.query.pipelines.findMany({
        where: eq(pipelines.orgId, orgId),
        with: {
          stages: true,
        },
      }),
      db.query.deals.findMany({
        where: eq(deals.orgId, orgId),
        with: {
          stage: true,
          owner: true,
        },
      }),
      db.query.contacts.findMany({
        where: and(eq(contacts.orgId, orgId), sql`${contacts.score} >= 75`),
        limit: 5,
        orderBy: [desc(contacts.score)],
      }),
      db.query.activities.findMany({
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
      }),
      getEnabledWidgetKeys().catch(() => []),
      getOrgDetails().catch(() => null),
    ]);

    const defaultPipeline = orgPipelines.find((p) => p.isDefault) || orgPipelines[0];
    const stagesDb = defaultPipeline?.stages || [];

    // Group deal values by stage
    const funnelData = stagesDb.map((st) => {
      const stageDeals = dealsDb.filter((d) => d.stageId === st.id);
      const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      return {
        stageName: st.name,
        value: totalValue,
        color: st.color,
      };
    });

    // 2. Forecast Data (weighted value grouped by close month)
    const forecastMap: Record<string, number> = {};
    for (const d of dealsDb) {
      const dAny = d as any;
      if (!dAny.expectedCloseDate) continue;
      const month = dAny.expectedCloseDate.slice(0, 7); // YYYY-MM
      if (dAny.stage?.type === "lost") continue;
      const weight = dAny.stage?.type === "won" ? 1.0 : (dAny.probability || 10) / 100;
      const weightedVal = (dAny.value || 0) * weight;

      forecastMap[month] = (forecastMap[month] || 0) + weightedVal;
    }

    const forecastData = Object.entries(forecastMap)
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(0, 6);

    // 3. Sales Leaderboard (sum won deal value by owner)
    const leaderboardMap: Record<string, number> = {};
    for (const d of dealsDb) {
      const dAny = d as any;
      if (dAny.stage?.type !== "won" || !dAny.owner) continue;
      const repName = dAny.owner.name;
      leaderboardMap[repName] = (leaderboardMap[repName] || 0) + (dAny.value || 0);
    }

    const leaderboardData = Object.entries(leaderboardMap)
      .map(([repName, value]) => ({ name: repName, value }))
      .sort((a, b) => b.value - a.value);

    return (
      <DashboardClient
        pipelines={(orgPipelines as any) || []}
        funnelData={funnelData}
        forecastData={forecastData}
        leaderboardData={leaderboardData}
        hotLeads={hotLeads || []}
        recentActivities={recentActivities || []}
        deals={(dealsDb as any) || []}
        stages={(stagesDb as any) || []}
        enabledWidgetKeys={enabledWidgetKeys || []}
        businessType={orgDetails?.businessType || "b2b_saas"}
      />
    );
  } catch (err) {
    console.error("Dashboard render error:", err);
    return (
      <DashboardClient
        pipelines={[]}
        funnelData={[]}
        forecastData={[]}
        leaderboardData={[]}
        hotLeads={[]}
        recentActivities={[]}
        deals={[]}
        stages={[]}
        enabledWidgetKeys={[]}
        businessType="b2b_saas"
      />
    );
  }
}
