import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "zoho.com",
  "gmx.com",
  "yandex.com",
  "live.com",
]);

/**
 * Resolves an existing company ID or automatically provisions a new company in the CRM.
 * Ensures contacts and deals are ALWAYS properly linked to a company when information is provided.
 */
export async function resolveOrCreateCompany(
  orgId: string,
  params: {
    companyId?: string | null;
    companyName?: string | null;
    email?: string | null;
    website?: string | null;
    linkedinUrl?: string | null;
    gstin?: string | null;
    employeeCount?: string | null;
    annualRevenue?: number | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
    customFields?: Record<string, any>;
  }
): Promise<string | null> {
  const { companyId, companyName, email, website, linkedinUrl, gstin, employeeCount, annualRevenue, address, city, state, country, postalCode, customFields } = params;

  // 1. If an existing company ID is passed, check if it exists in this tenant
  if (companyId) {
    const existingById = await db.query.companies.findFirst({
      where: and(eq(companies.orgId, orgId), eq(companies.id, companyId)),
    });
    if (existingById) return existingById.id;
  }

  // 2. Determine target company name
  let targetName: string | null =
    companyName?.trim() ||
    (customFields?.company as string)?.trim() ||
    (customFields?.companyName as string)?.trim() ||
    (customFields?.organization as string)?.trim() ||
    (customFields?.account as string)?.trim() ||
    null;

  // If companyId was passed as a non-matching string, use it as the name fallback
  if (!targetName && companyId) {
    targetName = companyId.trim();
  }

  // 3. Extract corporate domain if email is corporate
  let domain: string | null = null;
  if (email && email.includes("@")) {
    const rawDomain = email.split("@")[1]?.toLowerCase()?.trim();
    if (rawDomain && !FREE_EMAIL_DOMAINS.has(rawDomain)) {
      domain = rawDomain;
      if (!targetName) {
        const brand = rawDomain.split(".")[0];
        targetName = brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    }
  }

  if (website) {
    try {
      const url = new URL(website.startsWith("http") ? website : `https://${website}`);
      domain = domain || url.hostname.replace(/^www\./, "");
      if (!targetName) {
        const brand = domain.split(".")[0];
        targetName = brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    } catch {
      // Ignored
    }
  }

  // If still no company name can be derived, return null
  if (!targetName) return null;

  // 4. Look up existing company by exact name in this tenant
  const existingByName = await db.query.companies.findFirst({
    where: and(eq(companies.orgId, orgId), eq(companies.name, targetName)),
  });
  if (existingByName) return existingByName.id;

  // 5. Look up existing company by domain if available
  if (domain) {
    const existingByDomain = await db.query.companies.findFirst({
      where: and(eq(companies.orgId, orgId), eq(companies.domain, domain)),
    });
    if (existingByDomain) return existingByDomain.id;
  }

  // 6. Provision new company record
  const [newCompany] = await db
    .insert(companies)
    .values({
      orgId,
      name: targetName,
      domain: domain || null,
      website: website || (domain ? `https://${domain}` : null),
      linkedinUrl: linkedinUrl || null,
      gstin: gstin || (customFields?.gstin as string) || null,
      employeeCount: employeeCount || (customFields?.employeeCount as string) || null,
      annualRevenue: annualRevenue || Number(customFields?.annualRevenue) || null,
      address: address || (customFields?.address as string) || null,
      city: city || (customFields?.city as string) || null,
      state: state || (customFields?.state as string) || null,
      country: country || (customFields?.country as string) || null,
      postalCode: postalCode || (customFields?.postalCode as string) || null,
      industry: (customFields?.industry as string)?.trim() || null,
    })
    .returning();

  return newCompany.id;
}
