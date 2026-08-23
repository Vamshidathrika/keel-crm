"use server";

import { db } from "@/db";
import { orgWidgets } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { WIDGET_REGISTRY } from "@/lib/widgets/registry";
import { getDefaultWidgetsForType } from "@/lib/widgets/defaults";
import { revalidatePath } from "next/cache";

export async function getOrgWidgets() {
  const session = await auth();
  if (!session?.user) return [];

  const rows = await db.query.orgWidgets.findMany({
    where: eq(orgWidgets.orgId, session.user.orgId),
    orderBy: [orgWidgets.position],
  });

  // If org has no widget rows yet, return all core widgets as enabled
  if (rows.length === 0) {
    return WIDGET_REGISTRY.map((w, idx) => ({
      widgetKey: w.key,
      isEnabled: w.defaultFor === "all",
      position: idx,
    }));
  }

  return rows;
}

export async function getEnabledWidgetKeys(): Promise<string[]> {
  const session = await auth();
  if (!session?.user) return [];

  const rows = await db.query.orgWidgets.findMany({
    where: and(
      eq(orgWidgets.orgId, session.user.orgId),
      eq(orgWidgets.isEnabled, true)
    ),
  });

  if (rows.length === 0) {
    // Default: return all core widget keys
    return WIDGET_REGISTRY.filter((w) => w.defaultFor === "all").map((w) => w.key);
  }

  return rows.map((r) => r.widgetKey);
}

export async function toggleWidget(widgetKey: string, isEnabled: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") throw new Error("Unauthorized");

  const { orgId } = session.user;

  const existing = await db.query.orgWidgets.findFirst({
    where: and(
      eq(orgWidgets.orgId, orgId),
      eq(orgWidgets.widgetKey, widgetKey)
    ),
  });

  if (existing) {
    await db
      .update(orgWidgets)
      .set({ isEnabled })
      .where(and(eq(orgWidgets.orgId, orgId), eq(orgWidgets.widgetKey, widgetKey)));
  } else {
    // First time toggling — insert the row
    const maxPos = await db.query.orgWidgets.findMany({
      where: eq(orgWidgets.orgId, orgId),
    });
    await db.insert(orgWidgets).values({
      orgId,
      widgetKey,
      isEnabled,
      position: maxPos.length,
      config: {},
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function provisionDefaultWidgets(orgId: string, businessType: string) {
  const widgetKeys = getDefaultWidgetsForType(businessType);
  await db.insert(orgWidgets).values(
    widgetKeys.map((key, idx) => ({
      orgId,
      widgetKey: key,
      isEnabled: true,
      position: idx,
      config: {},
    }))
  );
}
