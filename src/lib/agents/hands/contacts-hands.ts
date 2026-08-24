import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import { eq, and, desc, like, or } from "drizzle-orm";

export const searchContactsTool = tool(
  async ({ orgId, query, limit = 10 }) => {
    const q = `%${query.trim()}%`;
    const results = await db.query.contacts.findMany({
      where: and(
        eq(contacts.orgId, orgId),
        or(
          like(contacts.firstName, q),
          like(contacts.lastName, q),
          like(contacts.email, q),
          like(contacts.phone, q)
        )
      ),
      with: { company: true },
      limit,
    });

    return {
      status: "success",
      count: results.length,
      contacts: results.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName || ""}`.trim(),
        email: c.email,
        phone: c.phone,
        title: c.title,
        companyName: c.company?.name || null,
        score: c.score,
        tags: c.tags,
      })),
    };
  },
  {
    name: "crm_search_contacts",
    description: "Search contacts in the CRM by name, email, or phone number.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      query: z.string().describe("Search keyword (name, email, or phone)"),
      limit: z.number().optional().default(10),
    }),
  }
);

export const createContactTool = tool(
  async ({ orgId, firstName, lastName, email, phone, title, companyId, tags = [] }) => {
    const [newContact] = await db
      .insert(contacts)
      .values({
        orgId,
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        title: title?.trim() || null,
        companyId: companyId || null,
        tags,
        score: 35,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "note",
      relatedContactId: newContact.id,
      body: `🤖 Agent Hands created contact: ${newContact.firstName} ${newContact.lastName || ""}`,
      source: "ai",
    });

    return {
      status: "success",
      summary: `Created contact ${newContact.firstName} (${newContact.id})`,
      contactId: newContact.id,
    };
  },
  {
    name: "crm_create_contact",
    description: "Create a new contact record in the CRM.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      firstName: z.string().describe("First name"),
      lastName: z.string().optional().describe("Last name"),
      email: z.string().optional().describe("Email address"),
      phone: z.string().optional().describe("Phone number"),
      title: z.string().optional().describe("Job title"),
      companyId: z.string().optional().describe("Associated company ID"),
      tags: z.array(z.string()).optional().describe("List of tags"),
    }),
  }
);

export const updateContactLeadScoreTool = tool(
  async ({ orgId, contactId, score, band, recommendation }) => {
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, contactId), eq(contacts.orgId, orgId)),
    });

    if (!contact) return { status: "error", error: "Contact not found" };

    const updatedTags = new Set(contact.tags || []);
    updatedTags.delete("Hot Lead");
    updatedTags.delete("Warm Lead");
    updatedTags.delete("Cold Lead");

    if (band === "hot") updatedTags.add("Hot Lead");
    else if (band === "warm") updatedTags.add("Warm Lead");
    else updatedTags.add("Cold Lead");

    await db
      .update(contacts)
      .set({
        score: Math.min(100, Math.max(0, score)),
        scoreBreakdown: {
          band,
          factors: [{ label: "Agent Evaluation", direction: "up", explanation: recommendation }],
          recommendation,
        },
        tags: Array.from(updatedTags),
      })
      .where(eq(contacts.id, contactId));

    return {
      status: "success",
      summary: `Updated lead score for contact ${contactId} to ${score}/100 [${band.toUpperCase()}]`,
    };
  },
  {
    name: "crm_update_lead_score",
    description: "Update the empirical lead score and band for a contact.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      contactId: z.string().describe("The contact ID"),
      score: z.number().min(0).max(100).describe("Lead score (0-100)"),
      band: z.enum(["hot", "warm", "cold"]).describe("Lead tier band"),
      recommendation: z.string().describe("Actionable sales recommendation"),
    }),
  }
);
