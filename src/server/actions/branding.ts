"use server";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface BrandingConfig {
  appName?: string;
  logoUrl?: string;
  primaryColor?: string;
  tagline?: string;
  faviconUrl?: string;
  invoiceTemplate?: "gradient" | "yellow";
}

export async function getBrandingConfig(): Promise<BrandingConfig> {
  const session = await auth();
  if (!session?.user) return {};

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.user.orgId),
  });

  return (org?.brandingConfig as BrandingConfig) ?? {};
}

export async function saveBrandingConfig(config: BrandingConfig) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") throw new Error("Unauthorized");

  await db
    .update(organizations)
    .set({ brandingConfig: config })
    .where(eq(organizations.id, session.user.orgId));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function getOrgDetails() {
  const session = await auth();
  if (!session?.user) return null;

  return db.query.organizations.findFirst({
    where: eq(organizations.id, session.user.orgId),
  });
}
