"use server";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ownerScope } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCompanies() {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(companies.orgId, orgId)];
  if (ownerIdFilter) {
    conditions.push(eq(companies.ownerId, ownerIdFilter));
  }

  return db.query.companies.findMany({
    where: and(...conditions),
    orderBy: [desc(companies.createdAt)],
  });
}

export async function createCompany(data: {
  name: string;
  domain?: string;
  industry?: string;
  website?: string;
  tags?: string[];
  customFields?: Record<string, string>;
  ownerId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const ownerId = session.user.role === "rep" ? userId : (data.ownerId || userId);

  const [company] = await db
    .insert(companies)
    .values({
      orgId,
      name: data.name.trim(),
      domain: data.domain?.trim() || null,
      industry: data.industry?.trim() || null,
      website: data.website?.trim() || null,
      ownerId,
      tags: data.tags || [],
      customFields: data.customFields || {},
    })
    .returning();

  await logAuditEntry(orgId, userId, "create", "company", company.id, {
    companyId: company.id,
    name: company.name,
  });

  revalidatePath("/dashboard/companies");
  return company;
}

export async function updateCompany(
  id: string,
  data: {
    name?: string;
    domain?: string;
    industry?: string;
    website?: string;
    tags?: string[];
    customFields?: Record<string, string>;
    ownerId?: string;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(companies.orgId, orgId), eq(companies.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(companies.ownerId, ownerIdFilter));
  }

  const company = await db.query.companies.findFirst({
    where: and(...conditions),
  });

  if (!company) throw new Error("Company not found or access denied.");

  const [updated] = await db
    .update(companies)
    .set({
      name: data.name !== undefined ? data.name.trim() : company.name,
      domain: data.domain !== undefined ? (data.domain.trim() || null) : company.domain,
      industry: data.industry !== undefined ? (data.industry.trim() || null) : company.industry,
      website: data.website !== undefined ? (data.website.trim() || null) : company.website,
      ownerId: data.ownerId !== undefined && role !== "rep" ? data.ownerId : company.ownerId,
      tags: data.tags !== undefined ? data.tags : company.tags,
      customFields: data.customFields !== undefined ? data.customFields : company.customFields,
    })
    .where(eq(companies.id, id))
    .returning();

  await logAuditEntry(orgId, userId, "update", "company", id, data as Record<string, unknown>);

  revalidatePath("/dashboard/companies");
  return updated;
}

export async function deleteCompany(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(companies.orgId, orgId), eq(companies.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(companies.ownerId, ownerIdFilter));
  }

  const company = await db.query.companies.findFirst({
    where: and(...conditions),
  });

  if (!company) throw new Error("Company not found or access denied.");

  await db.delete(companies).where(eq(companies.id, id));

  await logAuditEntry(orgId, userId, "delete", "company", id, {
    companyId: id,
    name: company.name,
  });

  revalidatePath("/dashboard/companies");
  return { success: true };
}
