"use server";

import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ownerScope } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { triggerWorkflows } from "@/app/actions/automations";
import { runProspectorAgent } from "@/lib/agents/prospector";
import { resolveOrCreateCompany } from "@/lib/crm/companies";
import { dispatchWebhookEvent } from "@/lib/webhooks-dispatcher";

export async function getContacts() {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(contacts.orgId, orgId)];
  if (ownerIdFilter) {
    conditions.push(eq(contacts.ownerId, ownerIdFilter));
  }

  return db.query.contacts.findMany({
    where: and(...conditions),
    with: {
      company: true,
    },
    orderBy: [desc(contacts.createdAt)],
  });
}

export async function getContactById(id: string) {
  const session = await auth();
  if (!session?.user) return null;

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(contacts.orgId, orgId), eq(contacts.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(contacts.ownerId, ownerIdFilter));
  }

  return db.query.contacts.findFirst({
    where: and(...conditions),
    with: {
      company: true,
    },
  });
}

export async function createContact(data: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  title?: string;
  department?: string;
  seniorityLevel?: "c_level" | "vp" | "director" | "manager" | "staff" | "other";
  buyingRole?: "decision_maker" | "champion" | "economic_buyer" | "influencer" | "blocker" | "end_user" | "evaluator";
  preferredChannel?: "email" | "whatsapp" | "phone" | "sms";
  linkedinUrl?: string;
  timezone?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  companyId?: string;
  companyName?: string;
  tags?: string[];
  customFields?: Record<string, string>;
  ownerId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  // Reps default to owning their created contacts
  const ownerId = session.user.role === "rep" ? userId : (data.ownerId || userId);

  // Auto-resolve or provision company
  const resolvedCompanyId = await resolveOrCreateCompany(orgId, {
    companyId: data.companyId,
    companyName: data.companyName,
    email: data.email,
    customFields: data.customFields,
  });

  const [contact] = await db
    .insert(contacts)
    .values({
      orgId,
      companyId: resolvedCompanyId,
      firstName: data.firstName.trim(),
      lastName: data.lastName?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      title: data.title?.trim() || null,
      department: data.department?.trim() || null,
      seniorityLevel: data.seniorityLevel || null,
      buyingRole: data.buyingRole || null,
      preferredChannel: data.preferredChannel || "email",
      linkedinUrl: data.linkedinUrl?.trim() || null,
      timezone: data.timezone?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      country: data.country?.trim() || null,
      postalCode: data.postalCode?.trim() || null,
      source: "manual",
      ownerId,
      tags: data.tags || [],
      customFields: data.customFields || {},
      score: 30, // Heuristic default starting score
    })
    .returning();

  // Create timeline activity log
  await db.insert(activities).values({
    orgId,
    type: "note",
    relatedContactId: contact.id,
    actorUserId: userId,
    body: "Contact created manually.",
    source: "manual",
  });

  // Log audit trail
  await logAuditEntry(orgId, userId, "create", "contact", contact.id, {
    contactId: contact.id,
    name: `${contact.firstName} ${contact.lastName || ""}`,
  });

  await triggerWorkflows(orgId, "contact_created", contact.id, {
    contactId: contact.id,
    companyId: contact.companyId,
    ownerId: contact.ownerId,
  });

  // Outbound Webhook Event Dispatch
  dispatchWebhookEvent(orgId, "contact.created", {
    contactId: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    companyId: contact.companyId,
  }).catch((err) => console.error("Webhook dispatch error:", err));

  revalidatePath("/dashboard/contacts");
  return contact;
}

export async function updateContact(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    title?: string;
    department?: string;
    seniorityLevel?: "c_level" | "vp" | "director" | "manager" | "staff" | "other";
    buyingRole?: "decision_maker" | "champion" | "economic_buyer" | "influencer" | "blocker" | "end_user" | "evaluator";
    preferredChannel?: "email" | "whatsapp" | "phone" | "sms";
    linkedinUrl?: string;
    timezone?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    companyId?: string;
    tags?: string[];
    customFields?: Record<string, string>;
    ownerId?: string;
    score?: number;
    scoreBreakdown?: any;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(contacts.orgId, orgId), eq(contacts.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(contacts.ownerId, ownerIdFilter));
  }

  // Verify ownership before updating
  const contact = await db.query.contacts.findFirst({
    where: and(...conditions),
  });

  if (!contact) throw new Error("Contact not found or access denied.");

  const [updated] = await db
    .update(contacts)
    .set({
      companyId: data.companyId !== undefined ? (data.companyId || null) : contact.companyId,
      firstName: data.firstName !== undefined ? data.firstName.trim() : contact.firstName,
      lastName: data.lastName !== undefined ? (data.lastName.trim() || null) : contact.lastName,
      email: data.email !== undefined ? (data.email.trim() || null) : contact.email,
      phone: data.phone !== undefined ? (data.phone.trim() || null) : contact.phone,
      whatsapp: data.whatsapp !== undefined ? (data.whatsapp.trim() || null) : contact.whatsapp,
      title: data.title !== undefined ? (data.title.trim() || null) : contact.title,
      department: data.department !== undefined ? (data.department.trim() || null) : contact.department,
      seniorityLevel: data.seniorityLevel !== undefined ? data.seniorityLevel : contact.seniorityLevel,
      buyingRole: data.buyingRole !== undefined ? data.buyingRole : contact.buyingRole,
      preferredChannel: data.preferredChannel !== undefined ? data.preferredChannel : contact.preferredChannel,
      linkedinUrl: data.linkedinUrl !== undefined ? (data.linkedinUrl.trim() || null) : contact.linkedinUrl,
      timezone: data.timezone !== undefined ? (data.timezone.trim() || null) : contact.timezone,
      city: data.city !== undefined ? (data.city.trim() || null) : contact.city,
      state: data.state !== undefined ? (data.state.trim() || null) : contact.state,
      country: data.country !== undefined ? (data.country.trim() || null) : contact.country,
      postalCode: data.postalCode !== undefined ? (data.postalCode.trim() || null) : contact.postalCode,
      ownerId: data.ownerId !== undefined && role !== "rep" ? data.ownerId : contact.ownerId,
      tags: data.tags !== undefined ? data.tags : contact.tags,
      customFields: data.customFields !== undefined ? data.customFields : contact.customFields,
      score: data.score !== undefined ? data.score : contact.score,
      scoreBreakdown: data.scoreBreakdown !== undefined ? data.scoreBreakdown : contact.scoreBreakdown,
    })
    .where(and(...conditions))
    .returning();

  await logAuditEntry(orgId, userId, "update", "contact", id, data as Record<string, unknown>);

  revalidatePath("/dashboard/contacts");
  return updated;
}

export async function deleteContact(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  const ownerIdFilter = ownerScope(role, userId);

  const conditions = [eq(contacts.orgId, orgId), eq(contacts.id, id)];
  if (ownerIdFilter) {
    conditions.push(eq(contacts.ownerId, ownerIdFilter));
  }

  const contact = await db.query.contacts.findFirst({
    where: and(...conditions),
  });

  if (!contact) throw new Error("Contact not found or access denied.");

  await db.delete(contacts).where(and(...conditions));

  await logAuditEntry(orgId, userId, "delete", "contact", id, {
    contactId: id,
    name: `${contact.firstName} ${contact.lastName || ""}`,
  });

  revalidatePath("/dashboard/contacts");
  return { success: true };
}
