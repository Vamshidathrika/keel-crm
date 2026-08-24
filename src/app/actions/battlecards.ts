"use server";

import { db } from "@/db";
import { competitorBattlecards } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getBattlecards() {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId } = session.user;

  let cards = await db.query.competitorBattlecards.findMany({
    where: eq(competitorBattlecards.orgId, orgId),
    orderBy: [desc(competitorBattlecards.createdAt)],
  });

  return cards;
}

export async function createOrUpdateBattlecard(data: {
  id?: string;
  competitorName: string;
  pricingComparison: string;
  ourStrengths: string[];
  theirWeaknesses: string[];
  objectionHandlers: { objection: string; response: string }[];
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  if (data.id) {
    await db
      .update(competitorBattlecards)
      .set({
        competitorName: data.competitorName,
        pricingComparison: data.pricingComparison,
        ourStrengths: data.ourStrengths,
        theirWeaknesses: data.theirWeaknesses,
        objectionHandlers: data.objectionHandlers,
      })
      .where(and(eq(competitorBattlecards.id, data.id), eq(competitorBattlecards.orgId, orgId)));
  } else {
    await db.insert(competitorBattlecards).values({
      orgId,
      competitorName: data.competitorName,
      pricingComparison: data.pricingComparison,
      ourStrengths: data.ourStrengths,
      theirWeaknesses: data.theirWeaknesses,
      objectionHandlers: data.objectionHandlers,
    });
  }

  revalidatePath("/dashboard/deals");
  return { success: true };
}
