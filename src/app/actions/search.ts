"use server";

import { db } from "@/db";
import { contacts, companies, deals } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ownerScope } from "@/lib/permissions";
import { eq, and, like, or } from "drizzle-orm";

export async function globalSearch(query: string) {
  const session = await auth();
  if (!session?.user) return { contacts: [], companies: [], deals: [] };

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);
  const cleanQuery = `%${query.trim().toLowerCase()}%`;

  if (!query.trim()) {
    return { contacts: [], companies: [], deals: [] };
  }

  // 1. Search Contacts
  const contactConditions = [eq(contacts.orgId, orgId)];
  if (ownerIdFilter) {
    contactConditions.push(eq(contacts.ownerId, ownerIdFilter));
  }
  const contactMatches = await db.query.contacts.findMany({
    where: and(
      ...contactConditions,
      or(
        like(contacts.firstName, cleanQuery),
        like(contacts.lastName, cleanQuery),
        like(contacts.email, cleanQuery),
        like(contacts.phone, cleanQuery)
      )
    ),
    limit: 5,
  });

  // 2. Search Companies
  const companyConditions = [eq(companies.orgId, orgId)];
  if (ownerIdFilter) {
    companyConditions.push(eq(companies.ownerId, ownerIdFilter));
  }
  const companyMatches = await db.query.companies.findMany({
    where: and(
      ...companyConditions,
      or(
        like(companies.name, cleanQuery),
        like(companies.domain, cleanQuery)
      )
    ),
    limit: 5,
  });

  // 3. Search Deals
  const dealConditions = [eq(deals.orgId, orgId)];
  if (ownerIdFilter) {
    dealConditions.push(eq(deals.ownerId, ownerIdFilter));
  }
  const dealMatches = await db.query.deals.findMany({
    where: and(
      ...dealConditions,
      like(deals.title, cleanQuery)
    ),
    limit: 5,
  });

  return {
    contacts: contactMatches,
    companies: companyMatches,
    deals: dealMatches,
  };
}
