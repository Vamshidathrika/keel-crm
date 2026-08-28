"use server";

import { db } from "@/db";
import { deals, contacts, companies, tasks, pipelines, stages } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const DEMO_TAG = "demo_sandbox";

interface VerticalDemoContent {
  companies: Array<{ name: string; domain: string; industry: string; city: string }>;
  contacts: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title: string;
    buyingRole: "decision_maker" | "champion" | "economic_buyer" | "influencer" | "blocker" | "end_user" | "evaluator";
    score: number;
    band: "hot" | "warm" | "cold";
    recommendation: string;
    factors: Array<{ label: string; direction: "up" | "down"; explanation: string }>;
  }>;
  deals: Array<{
    title: string;
    value: number;
    stageIndex: number; // 0: New, 1: Contacted, 2: Qualified, 3: Proposal, 4: Won
    currency: string;
  }>;
  tasks: Array<{
    title: string;
    description: string;
    priority: "urgent" | "high" | "normal" | "low";
  }>;
}

const VERTICAL_DEMO_TEMPLATES: Record<string, VerticalDemoContent> = {
  logistics: {
    companies: [
      { name: "Skyline Ocean Line", domain: "skylineocean.com", industry: "Ocean Freight", city: "Mumbai" },
      { name: "Apex Cargo Worldwide", domain: "apexcargo.io", industry: "3PL / Cold Chain", city: "Dubai" },
      { name: "Trans-Continental Express", domain: "transcontinental.eu", industry: "Air Freight", city: "Hamburg" },
    ],
    contacts: [
      {
        firstName: "Vikram",
        lastName: "Mehta",
        email: "v.mehta@skylineocean.com",
        phone: "+91 98200 12345",
        title: "VP of Supply Chain",
        buyingRole: "decision_maker",
        score: 94,
        band: "hot",
        recommendation: "High volume ocean route. Quote expedited transit time for 40ft reefer contract.",
        factors: [
          { label: "Frequent Lane Search", direction: "up", explanation: "Requested 12 TEU monthly capacity JNPT -> Rotterdam" },
          { label: "Executive Authority", direction: "up", explanation: "Final budget signatory for global logistics" },
        ],
      },
      {
        firstName: "Elena",
        lastName: "Rostova",
        email: "elena@apexcargo.io",
        phone: "+971 50 882 1199",
        title: "Director of Procurement",
        buyingRole: "champion",
        score: 82,
        band: "warm",
        recommendation: "Review customs clearance SLA and schedule proposal walkthrough call.",
        factors: [
          { label: "Active RFQ", direction: "up", explanation: "Opened rate sheet 4 times in the last 48 hours" },
        ],
      },
      {
        firstName: "Marcus",
        lastName: "Weber",
        email: "m.weber@transcontinental.eu",
        phone: "+49 40 334455",
        title: "Operations Lead",
        buyingRole: "evaluator",
        score: 68,
        band: "warm",
        recommendation: "Send air cargo rate calculator integration demo.",
        factors: [
          { label: "Trial Activity", direction: "up", explanation: "Tested cargo weight estimator widget" },
        ],
      },
    ],
    deals: [
      { title: "20x 40ft Reefer Ocean Contract (JNPT -> Rotterdam)", value: 1850000, stageIndex: 3, currency: "INR" },
      { title: "Air Freight Charter - Munich to Bangalore", value: 920000, stageIndex: 2, currency: "INR" },
      { title: "Pharma Cold-Chain 3PL Distribution Agreement", value: 3400000, stageIndex: 1, currency: "INR" },
    ],
    tasks: [
      { title: "Send Bill of Lading draft to Skyline Ocean", description: "Verify container seal numbers and hazardous cargo declaration.", priority: "urgent" },
      { title: "Follow up on customs clearance insurance quote", description: "Elena requested updated demurrage terms.", priority: "high" },
    ],
  },
  saas: {
    companies: [
      { name: "CloudScale Systems", domain: "cloudscalesys.com", industry: "B2B Infrastructure", city: "San Francisco" },
      { name: "FinPulse Analytics", domain: "finpulse.io", industry: "Fintech SaaS", city: "Bengaluru" },
      { name: "Nexus AI Lab", domain: "nexuslab.ai", industry: "Developer Tools", city: "London" },
    ],
    contacts: [
      {
        firstName: "Arun",
        lastName: "Krishnamurthy",
        email: "arun@finpulse.io",
        phone: "+91 99881 22334",
        title: "CTO & Co-Founder",
        buyingRole: "decision_maker",
        score: 96,
        band: "hot",
        recommendation: "Ready to close Enterprise plan with 50 seats. Send SOC2 type II compliance pack.",
        factors: [
          { label: "API Quota Cap Reached", direction: "up", explanation: "Surpassed 100k events/day in trial" },
          { label: "Invited 6 Engineers", direction: "up", explanation: "Multi-seat viral expansion in trial workspace" },
        ],
      },
      {
        firstName: "Sarah",
        lastName: "Jenkins",
        email: "sarah@cloudscalesys.com",
        phone: "+1 415 800 2931",
        title: "Head of Product",
        buyingRole: "champion",
        score: 85,
        band: "warm",
        recommendation: "Schedule security review and custom webhook integrations demo.",
        factors: [
          { label: "Pricing Page View", direction: "up", explanation: "Checked Annual billing discount" },
        ],
      },
      {
        firstName: "David",
        lastName: "Sterling",
        email: "david@nexuslab.ai",
        phone: "+44 20 7946 0912",
        title: "VP Engineering",
        buyingRole: "evaluator",
        score: 72,
        band: "warm",
        recommendation: "Provide sandbox API keys for proof of concept.",
        factors: [
          { label: "GitHub Integration Click", direction: "up", explanation: "Interested in automated sync" },
        ],
      },
    ],
    deals: [
      { title: "Annual Enterprise License (100 Seats + Dedicated AI)", value: 2400000, stageIndex: 3, currency: "INR" },
      { title: "FinPulse Growth Tier Expansion", value: 850000, stageIndex: 2, currency: "INR" },
      { title: "Nexus Developer Hub Trial Conversion", value: 450000, stageIndex: 1, currency: "INR" },
    ],
    tasks: [
      { title: "Send SOC2 Type II & DPA to Arun at FinPulse", description: "Legal review required before Friday contract signing.", priority: "urgent" },
      { title: "Schedule technical architecture sync with CloudScale", description: "Demonstrate SSO & SCIM directory sync.", priority: "high" },
    ],
  },
  real_estate: {
    companies: [
      { name: "Prestige Skylines Realty", domain: "prestigeskylines.com", industry: "Commercial Real Estate", city: "Bengaluru" },
      { name: "Urban Living Developers", domain: "urbanlivingdev.com", industry: "Residential Luxury", city: "Hyderabad" },
      { name: "Metro Commercial Assets", domain: "metroassets.in", industry: "Retail Leasing", city: "Mumbai" },
    ],
    contacts: [
      {
        firstName: "Rajesh",
        lastName: "Reddy",
        email: "r.reddy@prestigeskylines.com",
        phone: "+91 98490 88776",
        title: "Managing Director",
        buyingRole: "decision_maker",
        score: 95,
        band: "hot",
        recommendation: "High net-worth buyer. Ready for site visit at Downtown Commercial Tower.",
        factors: [
          { label: "Floor Plan Download", direction: "up", explanation: "Downloaded 15,000 sq ft penthouse brochure" },
          { label: "Pre-approved Loan", direction: "up", explanation: "HDFC bank sanction letter submitted" },
        ],
      },
      {
        firstName: "Ananya",
        lastName: "Sharma",
        email: "ananya@urbanlivingdev.com",
        phone: "+91 97110 54321",
        title: "Chief Investment Officer",
        buyingRole: "champion",
        score: 84,
        band: "warm",
        recommendation: "Send ROI breakdown for 3-unit luxury villa package.",
        factors: [
          { label: "Scheduled Site Visit", direction: "up", explanation: "Confirmed for this Saturday 11:00 AM" },
        ],
      },
      {
        firstName: "Karan",
        lastName: "Singhania",
        email: "karan@metroassets.in",
        phone: "+91 99200 44556",
        title: "Leasing Head",
        buyingRole: "evaluator",
        score: 70,
        band: "warm",
        recommendation: "Send retail anchor tenant master agreement draft.",
        factors: [
          { label: "Escrow Calculator Used", direction: "up", explanation: "Estimated 9-year lease yield" },
        ],
      },
    ],
    deals: [
      { title: "15,000 Sq Ft Commercial Floor Sale (Prestige Tower B)", value: 12500000, stageIndex: 3, currency: "INR" },
      { title: "Luxury 4-BHK Sky Villa with Private Pool", value: 6500000, stageIndex: 2, currency: "INR" },
      { title: "Retail Food Court Anchor Lease (5-Year Term)", value: 2800000, stageIndex: 1, currency: "INR" },
    ],
    tasks: [
      { title: "Prepare Agreement of Sale for Prestige Floor B", description: "Include parking allotment and maintenance escrow terms.", priority: "urgent" },
      { title: "Confirm Saturday site visit chauffeur for Rajesh Reddy", description: "VIP inspection at Downtown Commercial.", priority: "high" },
    ],
  },
  default: {
    companies: [
      { name: "Acme Enterprises Ltd", domain: "acme-global.com", industry: "Enterprise Services", city: "Mumbai" },
      { name: "Vertex Solutions", domain: "vertexsol.com", industry: "Consulting & Tech", city: "Bengaluru" },
      { name: "Horizon Global Corp", domain: "horizonglobal.io", industry: "Commercial Operations", city: "Delhi" },
    ],
    contacts: [
      {
        firstName: "Siddharth",
        lastName: "Verma",
        email: "siddharth@acme-global.com",
        phone: "+91 98112 34567",
        title: "Chief Commercial Officer",
        buyingRole: "decision_maker",
        score: 92,
        band: "hot",
        recommendation: "High-intent lead. Send tailored multi-year partnership agreement.",
        factors: [
          { label: "Budget Approved", direction: "up", explanation: "Confirmed allocated CapEx for Q3" },
          { label: "Frequent Engagement", direction: "up", explanation: "Visited workspace portals 5 times this week" },
        ],
      },
      {
        firstName: "Neha",
        lastName: "Kapoor",
        email: "neha@vertexsol.com",
        phone: "+91 98765 43210",
        title: "VP Business Development",
        buyingRole: "champion",
        score: 80,
        band: "warm",
        recommendation: "Schedule executive alignment demo with board members.",
        factors: [
          { label: "Product Qualified", direction: "up", explanation: "Matches Ideal Customer Profile (ICP)" },
        ],
      },
      {
        firstName: "Rohan",
        lastName: "Deshmukh",
        email: "rohan@horizonglobal.io",
        phone: "+91 99670 11223",
        title: "Procurement Manager",
        buyingRole: "evaluator",
        score: 65,
        band: "warm",
        recommendation: "Send vendor onboarding questionnaire and commercial terms.",
        factors: [
          { label: "Commercial Inquiry", direction: "up", explanation: "Requested volume pricing breakdown" },
        ],
      },
    ],
    deals: [
      { title: "Annual Master Partnership Agreement 2026", value: 3200000, stageIndex: 3, currency: "INR" },
      { title: "Custom Integration & SLA Package", value: 1450000, stageIndex: 2, currency: "INR" },
      { title: "Pilot Deployment - Regional Headquarters", value: 650000, stageIndex: 1, currency: "INR" },
    ],
    tasks: [
      { title: "Finalize Master Services Agreement for Acme", description: "Incorporate SLA escalation matrix and net-30 payment terms.", priority: "urgent" },
      { title: "Follow up with Neha on executive demonstration", description: "Prepare tailored slides for C-level presentation.", priority: "high" },
    ],
  },
};

export async function seedVerticalSandboxData(
  orgId: string,
  userId: string,
  businessType: string
) {
  if (!orgId) throw new Error("Org ID is required to seed sandbox data");

  // Pick template
  const template = VERTICAL_DEMO_TEMPLATES[businessType] || VERTICAL_DEMO_TEMPLATES.default;

  // 1. Get default pipeline & stages for this org
  let pipeline = await db.query.pipelines.findFirst({
    where: and(eq(pipelines.orgId, orgId), eq(pipelines.isDefault, true)),
  });

  if (!pipeline) {
    pipeline = await db.query.pipelines.findFirst({
      where: eq(pipelines.orgId, orgId),
    });
  }

  if (!pipeline) return;

  const orgStages = await db.query.stages.findMany({
    where: eq(stages.pipelineId, pipeline.id),
    orderBy: [stages.order],
  });

  if (orgStages.length === 0) return;

  // 2. Insert Companies
  const createdCompanies = [];
  for (const cmp of template.companies) {
    const [c] = await db
      .insert(companies)
      .values({
        orgId,
        name: cmp.name,
        domain: cmp.domain,
        industry: cmp.industry,
        city: cmp.city,
        ownerId: userId,
        tags: [DEMO_TAG, cmp.industry],
      })
      .returning();
    createdCompanies.push(c);
  }

  // 3. Insert Contacts
  const createdContacts = [];
  for (let i = 0; i < template.contacts.length; i++) {
    const cnt = template.contacts[i];
    const relatedCompany = createdCompanies[i % createdCompanies.length];
    const [c] = await db
      .insert(contacts)
      .values({
        orgId,
        companyId: relatedCompany?.id,
        firstName: cnt.firstName,
        lastName: cnt.lastName,
        email: cnt.email,
        phone: cnt.phone,
        whatsapp: cnt.phone,
        title: cnt.title,
        buyingRole: cnt.buyingRole,
        ownerId: userId,
        tags: [DEMO_TAG, cnt.band],
        score: cnt.score,
        scoreBreakdown: {
          band: cnt.band,
          recommendation: cnt.recommendation,
          factors: cnt.factors,
        },
      })
      .returning();
    createdContacts.push(c);
  }

  // 4. Insert Deals
  const createdDeals = [];
  for (let i = 0; i < template.deals.length; i++) {
    const dl = template.deals[i];
    const targetStage = orgStages[Math.min(dl.stageIndex, orgStages.length - 1)];
    const relatedCompany = createdCompanies[i % createdCompanies.length];
    const relatedContact = createdContacts[i % createdContacts.length];

    const [d] = await db
      .insert(deals)
      .values({
        orgId,
        pipelineId: pipeline.id,
        stageId: targetStage.id,
        title: dl.title,
        value: dl.value,
        currency: dl.currency,
        companyId: relatedCompany?.id,
        contactId: relatedContact?.id,
        ownerId: userId,
        probability: targetStage.probability || 50,
        expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        customFields: { isDemo: true, sandboxTag: DEMO_TAG },
      })
      .returning();
    createdDeals.push(d);
  }

  // 5. Insert Tasks
  for (let i = 0; i < template.tasks.length; i++) {
    const tsk = template.tasks[i];
    const relatedDeal = createdDeals[i % createdDeals.length];
    const relatedContact = createdContacts[i % createdContacts.length];

    await db.insert(tasks).values({
      orgId,
      title: tsk.title,
      description: tsk.description,
      priority: tsk.priority,
      assigneeId: userId,
      createdById: userId,
      relatedDealId: relatedDeal?.id,
      relatedContactId: relatedContact?.id,
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    });
  }

  return {
    success: true,
    companiesSeeded: createdCompanies.length,
    contactsSeeded: createdContacts.length,
    dealsSeeded: createdDeals.length,
  };
}

export async function clearSandboxDemoData(orgId?: string) {
  let targetOrgId = orgId;
  if (!targetOrgId) {
    try {
      const session = await auth();
      if (session?.user?.orgId) {
        targetOrgId = session.user.orgId;
      }
    } catch (_ignored) {}
  }
  if (!targetOrgId) throw new Error("Unauthorized: Org ID required");

  // Delete all deals with demo_sandbox in customFields
  const allDeals = await db.query.deals.findMany({
    where: eq(deals.orgId, targetOrgId),
  });
  for (const d of allDeals) {
    const cf = (d.customFields as any) || {};
    if (cf.isDemo || cf.sandboxTag === DEMO_TAG) {
      await db.delete(deals).where(eq(deals.id, d.id));
    }
  }

  // Delete all contacts with demo_sandbox tag
  const allContacts = await db.query.contacts.findMany({
    where: eq(contacts.orgId, targetOrgId),
  });
  for (const c of allContacts) {
    const tagsArr = (c.tags as any) || [];
    if (Array.isArray(tagsArr) && tagsArr.includes(DEMO_TAG)) {
      await db.delete(contacts).where(eq(contacts.id, c.id));
    }
  }

  // Delete all companies with demo_sandbox tag
  const allCompanies = await db.query.companies.findMany({
    where: eq(companies.orgId, targetOrgId),
  });
  for (const comp of allCompanies) {
    const tagsArr = (comp.tags as any) || [];
    if (Array.isArray(tagsArr) && tagsArr.includes(DEMO_TAG)) {
      await db.delete(companies).where(eq(companies.id, comp.id));
    }
  }

  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deals");
    revalidatePath("/dashboard/contacts");
    revalidatePath("/dashboard/companies");
  } catch (_ignored) {}

  return { success: true };
}

export async function checkSandboxStatus(orgId: string) {
  if (!orgId) return { isDemo: false, demoDealsCount: 0 };
  const allDeals = await db.query.deals.findMany({
    where: eq(deals.orgId, orgId),
  });
  const demoDeals = allDeals.filter((d) => {
    const cf = (d.customFields as any) || {};
    return cf.isDemo === true || cf.sandboxTag === DEMO_TAG;
  });
  return {
    isDemo: demoDeals.length > 0,
    demoDealsCount: demoDeals.length,
  };
}
