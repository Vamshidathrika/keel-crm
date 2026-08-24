import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/db";
import { companies, activities } from "@/db/schema";
import { eq, and, desc, like, or } from "drizzle-orm";
import { toolEnrichCompany } from "../tools";

export const searchCompaniesTool = tool(
  async ({ orgId, query, limit = 10 }) => {
    const q = `%${query.trim()}%`;
    const results = await db.query.companies.findMany({
      where: and(
        eq(companies.orgId, orgId),
        or(like(companies.name, q), like(companies.domain, q), like(companies.industry, q))
      ),
      with: { contacts: true, deals: true },
      limit,
    });

    return {
      status: "success",
      count: results.length,
      companies: results.map((c) => ({
        id: c.id,
        name: c.name,
        domain: c.domain,
        industry: c.industry,
        contactsCount: c.contacts?.length || 0,
        dealsCount: c.deals?.length || 0,
        tags: c.tags,
        customFields: c.customFields,
      })),
    };
  },
  {
    name: "crm_search_companies",
    description: "Search companies / accounts in the CRM by name, domain, or industry.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      query: z.string().describe("Search query for company name or domain"),
      limit: z.number().optional().default(10),
    }),
  }
);

export const createCompanyTool = tool(
  async ({ orgId, name, domain, industry, website, tags = [] }) => {
    const [newComp] = await db
      .insert(companies)
      .values({
        orgId,
        name: name.trim(),
        domain: domain?.trim() || null,
        industry: industry?.trim() || null,
        website: website?.trim() || null,
        tags,
        customFields: {},
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "note",
      relatedCompanyId: newComp.id,
      body: `🤖 Agent Hands created company account: "${newComp.name}"`,
      source: "ai",
    });

    return {
      status: "success",
      summary: `Created company "${newComp.name}" (#${newComp.id})`,
      companyId: newComp.id,
    };
  },
  {
    name: "crm_create_company",
    description: "Create a new company / account record in the CRM.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      name: z.string().describe("Company name"),
      domain: z.string().optional().describe("Domain name (e.g. acme.com)"),
      industry: z.string().optional().describe("Industry category"),
      website: z.string().optional().describe("Website URL"),
      tags: z.array(z.string()).optional().describe("Tags"),
    }),
  }
);

export const enrichCompanyTool = tool(
  async ({ orgId, companyId, summary, icpTier, detectedTech = [], employeeRange }) => {
    const res = await toolEnrichCompany(orgId, companyId, {
      summary,
      icpFit: icpTier as any,
      techStack: detectedTech,
      employeeRange,
    });
    return res;
  },
  {
    name: "crm_enrich_company_dossier",
    description: "Inject AI intelligence dossier, ICP tiering, and tech stack into a company profile.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      companyId: z.string().describe("Company ID"),
      summary: z.string().describe("Account overview and signals summary"),
      icpTier: z.enum(["Tier 1 (High)", "Tier 2 (Medium)", "Tier 3 (Low)"]).describe("ICP tier category"),
      detectedTech: z.array(z.string()).optional().describe("Detected technology tools or frameworks"),
      employeeRange: z.string().optional().describe("Company scale / employee range"),
    }),
  }
);
