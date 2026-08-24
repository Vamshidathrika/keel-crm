import { db } from "@/db";
import {
  contacts,
  deals,
  companies,
  activities,
  tasks,
  notes,
  invoices,
  quotations,
  clients,
  projects,
  followups,
  tags,
} from "@/db/schema";
import { eq, and, SQL } from "drizzle-orm";

/**
 * Tenant-Scoped Database Query Factory.
 * Automatically injects `eq(table.orgId, orgId)` on every query and mutation,
 * making cross-tenant data leakage or direct object reference impossible by design.
 */
export function scopedDb(orgId: string) {
  if (!orgId || typeof orgId !== "string") {
    throw new Error("Cannot instantiate scopedDb without a valid orgId string.");
  }

  return {
    orgId,

    // Contacts
    contacts: {
      findMany: (whereClause?: SQL<unknown>) =>
        db.query.contacts.findMany({
          where: whereClause ? and(eq(contacts.orgId, orgId), whereClause) : eq(contacts.orgId, orgId),
          with: { company: true },
        }),
      findFirst: (whereClause: SQL<unknown>) =>
        db.query.contacts.findFirst({
          where: and(eq(contacts.orgId, orgId), whereClause),
          with: { company: true },
        }),
      findById: (contactId: string) =>
        db.query.contacts.findFirst({
          where: and(eq(contacts.orgId, orgId), eq(contacts.id, contactId)),
          with: { company: true },
        }),
      insert: (data: Omit<typeof contacts.$inferInsert, "orgId">) =>
        db.insert(contacts).values({ ...data, orgId }).returning(),
      deleteById: (contactId: string) =>
        db.delete(contacts).where(and(eq(contacts.orgId, orgId), eq(contacts.id, contactId))),
    },

    // Deals
    deals: {
      findMany: (whereClause?: SQL<unknown>) =>
        db.query.deals.findMany({
          where: whereClause ? and(eq(deals.orgId, orgId), whereClause) : eq(deals.orgId, orgId),
          with: { contact: true, company: true, stage: true, owner: true },
        }),
      findById: (dealId: string) =>
        db.query.deals.findFirst({
          where: and(eq(deals.orgId, orgId), eq(deals.id, dealId)),
          with: { contact: true, company: true, stage: true, owner: true },
        }),
      insert: (data: Omit<typeof deals.$inferInsert, "orgId">) =>
        db.insert(deals).values({ ...data, orgId }).returning(),
      updateById: (dealId: string, data: Partial<typeof deals.$inferInsert>) =>
        db.update(deals).set(data).where(and(eq(deals.orgId, orgId), eq(deals.id, dealId))).returning(),
      deleteById: (dealId: string) =>
        db.delete(deals).where(and(eq(deals.orgId, orgId), eq(deals.id, dealId))),
    },

    // Companies
    companies: {
      findMany: (whereClause?: SQL<unknown>) =>
        db.query.companies.findMany({
          where: whereClause ? and(eq(companies.orgId, orgId), whereClause) : eq(companies.orgId, orgId),
        }),
      findById: (companyId: string) =>
        db.query.companies.findFirst({
          where: and(eq(companies.orgId, orgId), eq(companies.id, companyId)),
        }),
      insert: (data: Omit<typeof companies.$inferInsert, "orgId">) =>
        db.insert(companies).values({ ...data, orgId }).returning(),
    },

    // Invoices & Quotes
    invoices: {
      findMany: (whereClause?: SQL<unknown>) =>
        db.query.invoices.findMany({
          where: whereClause ? and(eq(invoices.orgId, orgId), whereClause) : eq(invoices.orgId, orgId),
          with: { client: true, payments: true },
        }),
      findById: (invoiceId: string) =>
        db.query.invoices.findFirst({
          where: and(eq(invoices.orgId, orgId), eq(invoices.id, invoiceId)),
          with: { client: true, payments: true },
        }),
      insert: (data: Omit<typeof invoices.$inferInsert, "orgId">) =>
        db.insert(invoices).values({ ...data, orgId }).returning(),
    },

    quotations: {
      findMany: (whereClause?: SQL<unknown>) =>
        db.query.quotations.findMany({
          where: whereClause ? and(eq(quotations.orgId, orgId), whereClause) : eq(quotations.orgId, orgId),
          with: { client: true },
        }),
      findById: (quotationId: string) =>
        db.query.quotations.findFirst({
          where: and(eq(quotations.orgId, orgId), eq(quotations.id, quotationId)),
          with: { client: true },
        }),
      insert: (data: Omit<typeof quotations.$inferInsert, "orgId">) =>
        db.insert(quotations).values({ ...data, orgId }).returning(),
    },
  };
}
