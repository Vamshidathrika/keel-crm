"use server";

import { db } from "@/db";
import { customFieldDefinitions, pipelines, stages, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { logAuditEntry } from "@/lib/audit";
import { eq, and, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface CustomFieldInput {
  entityType: "contact" | "company" | "deal" | "project" | "custom_object";
  objectDefId?: string;
  key: string;
  label: string;
  fieldType: "text" | "number" | "currency" | "date" | "select" | "dropdown" | "multiselect" | "boolean" | "url" | "user_lookup";
  options?: string[];
  isRequired?: boolean;
  defaultValue?: string;
  readRoles?: string[];
  writeRoles?: string[];
  order?: number;
  isVisibleInList?: boolean;
}

/**
 * Get all Custom Field Definitions for an entity type in the current organization
 */
export async function getCustomFieldDefinitions(
  entityType: "contact" | "company" | "deal" | "project" | "custom_object",
  objectDefId?: string
) {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId, role } = session.user;

  const conditions = [
    eq(customFieldDefinitions.orgId, orgId),
    eq(customFieldDefinitions.entityType, entityType),
  ];

  if (objectDefId) {
    conditions.push(eq(customFieldDefinitions.objectDefId, objectDefId));
  }

  const defs = await db.query.customFieldDefinitions.findMany({
    where: and(...conditions),
    orderBy: [asc(customFieldDefinitions.order)],
  });

  // Role-based visibility filtering
  return defs.filter((d) => {
    const allowedRoles = (d.readRoles as string[]) || ["admin", "manager", "rep"];
    return allowedRoles.includes(role);
  });
}

/**
 * Create a new Custom Field Definition
 */
export async function createCustomFieldDefinition(data: CustomFieldInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  if (role === "rep") {
    throw new Error("Access Denied: Only Admins and Managers can configure custom fields.");
  }

  // Clean key to machine-safe snake_case
  const sanitizedKey = data.key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  const [field] = await db
    .insert(customFieldDefinitions)
    .values({
      orgId,
      entityType: data.entityType,
      objectDefId: data.objectDefId || null,
      key: sanitizedKey,
      label: data.label.trim(),
      fieldType: data.fieldType,
      options: data.options || [],
      isRequired: Boolean(data.isRequired),
      defaultValue: data.defaultValue || null,
      readRoles: data.readRoles || ["admin", "manager", "rep"],
      writeRoles: data.writeRoles || ["admin", "manager", "rep"],
      order: data.order || 0,
      isVisibleInList: data.isVisibleInList !== false,
    })
    .returning();

  await logAuditEntry(orgId, userId, "create", "custom_field", field.id, {
    key: field.key,
    label: field.label,
    entityType: field.entityType,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/deals");
  return field;
}

/**
 * Update an existing Custom Field Definition
 */
export async function updateCustomFieldDefinition(
  id: string,
  data: Partial<CustomFieldInput>
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  if (role === "rep") throw new Error("Access Denied");

  const [updated] = await db
    .update(customFieldDefinitions)
    .set({
      ...(data.label ? { label: data.label.trim() } : {}),
      ...(data.options ? { options: data.options } : {}),
      ...(typeof data.isRequired === "boolean" ? { isRequired: data.isRequired } : {}),
      ...(data.defaultValue !== undefined ? { defaultValue: data.defaultValue } : {}),
      ...(data.readRoles ? { readRoles: data.readRoles } : {}),
      ...(data.writeRoles ? { writeRoles: data.writeRoles } : {}),
      ...(typeof data.order === "number" ? { order: data.order } : {}),
      ...(typeof data.isVisibleInList === "boolean" ? { isVisibleInList: data.isVisibleInList } : {}),
    })
    .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.orgId, orgId)))
    .returning();

  await logAuditEntry(orgId, userId, "update", "custom_field", id, data);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/deals");
  return updated;
}

/**
 * Delete a Custom Field Definition
 */
export async function deleteCustomFieldDefinition(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId, role } = session.user;
  if (role === "rep") throw new Error("Access Denied");

  await db
    .delete(customFieldDefinitions)
    .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.orgId, orgId)));

  await logAuditEntry(orgId, userId, "delete", "custom_field", id, { id });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/deals");
  return { success: true };
}

/**
 * Apply 1-Click Industry Blueprint (Real Estate, Logistics, B2B SaaS, Agency, Healthcare)
 */
export async function applyIndustryBlueprint(
  industryKey: "real_estate" | "logistics" | "saas" | "agency" | "healthcare"
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const blueprints: Record<string, {
    fields: CustomFieldInput[];
    pipelineStages: Array<{ name: string; probability: number; color: string; type: "open" | "won" | "lost" }>;
  }> = {
    real_estate: {
      fields: [
        { entityType: "deal", key: "property_type", label: "Property Type", fieldType: "dropdown", options: ["Residential Apartment", "Commercial Office", "Luxury Villa", "Plot / Land"], isRequired: true, order: 1 },
        { entityType: "deal", key: "bedrooms", label: "Bedrooms (BHK)", fieldType: "dropdown", options: ["1 BHK", "2 BHK", "3 BHK", "4+ BHK / Villa"], isRequired: false, order: 2 },
        { entityType: "deal", key: "carpet_sqft", label: "Carpet Area (Sq.Ft)", fieldType: "number", isRequired: false, order: 3 },
        { entityType: "deal", key: "rera_number", label: "RERA Registration No.", fieldType: "text", isRequired: false, order: 4 },
        { entityType: "contact", key: "investor_type", label: "Buyer Type", fieldType: "dropdown", options: ["End User", "NRI Investor", "Commercial Tenant"], order: 1 },
      ],
      pipelineStages: [
        { name: "Inbound Inquiry", probability: 10, color: "#3B82F6", type: "open" },
        { name: "Site Visit Scheduled", probability: 30, color: "#8B5CF6", type: "open" },
        { name: "Site Visit Completed", probability: 50, color: "#F59E0B", type: "open" },
        { name: "Token Advance Paid", probability: 80, color: "#EC4899", type: "open" },
        { name: "Agreement Executed (Won)", probability: 100, color: "#10B981", type: "won" },
        { name: "Lost / Backed Out", probability: 0, color: "#EF4444", type: "lost" },
      ],
    },
    logistics: {
      fields: [
        { entityType: "deal", key: "origin_port", label: "Origin Port / Hub", fieldType: "text", isRequired: true, order: 1 },
        { entityType: "deal", key: "destination_port", label: "Destination Port", fieldType: "text", isRequired: true, order: 2 },
        { entityType: "deal", key: "container_type", label: "Container Mode", fieldType: "dropdown", options: ["20ft Standard", "40ft High Cube", "LCL Consolidation", "Air Cargo Express"], isRequired: true, order: 3 },
        { entityType: "deal", key: "customs_duty_inr", label: "Customs Duty (₹)", fieldType: "currency", isRequired: false, order: 4 },
        { entityType: "contact", key: "iec_code", label: "Import Export Code (IEC)", fieldType: "text", order: 1 },
      ],
      pipelineStages: [
        { name: "Freight RFQ / Rate Request", probability: 15, color: "#3B82F6", type: "open" },
        { name: "Customs Clearance", probability: 40, color: "#8B5CF6", type: "open" },
        { name: "Vessel / Air Loading", probability: 65, color: "#F59E0B", type: "open" },
        { name: "In Transit", probability: 85, color: "#EC4899", type: "open" },
        { name: "Delivered & Invoiced (Won)", probability: 100, color: "#10B981", type: "won" },
        { name: "Shipment Cancelled", probability: 0, color: "#EF4444", type: "lost" },
      ],
    },
    saas: {
      fields: [
        { entityType: "deal", key: "arr_value", label: "Annual Recurring Rev (ARR)", fieldType: "currency", isRequired: true, order: 1 },
        { entityType: "deal", key: "seat_count", label: "User Seat Licenses", fieldType: "number", isRequired: false, order: 2 },
        { entityType: "deal", key: "billing_frequency", label: "Billing Frequency", fieldType: "dropdown", options: ["Monthly", "Annual Pre-paid", "Multi-Year Contract"], order: 3 },
        { entityType: "contact", key: "tech_stack", label: "Core Cloud Tech Stack", fieldType: "text", order: 1 },
      ],
      pipelineStages: [
        { name: "Discovery", probability: 20, color: "#3B82F6", type: "open" },
        { name: "Product Demo", probability: 40, color: "#8B5CF6", type: "open" },
        { name: "Technical / Security Review", probability: 60, color: "#F59E0B", type: "open" },
        { name: "Commercial Proposal", probability: 80, color: "#EC4899", type: "open" },
        { name: "Closed Won", probability: 100, color: "#10B981", type: "won" },
        { name: "Closed Lost", probability: 0, color: "#EF4444", type: "lost" },
      ],
    },
    agency: {
      fields: [
        { entityType: "deal", key: "retainer_months", label: "Retainer Duration (Months)", fieldType: "number", isRequired: true, order: 1 },
        { entityType: "deal", key: "service_deliverables", label: "Scope of Services", fieldType: "dropdown", options: ["Fullstack Dev & Maintenance", "Brand Strategy & Design", "Growth Performance Marketing", "UI/UX Product Audit"], order: 2 },
        { entityType: "project", key: "client_portal_access", label: "Client Portal Enabled", fieldType: "boolean", order: 1 },
      ],
      pipelineStages: [
        { name: "Initial Briefing", probability: 20, color: "#3B82F6", type: "open" },
        { name: "Scope & CPQ Estimate", probability: 50, color: "#8B5CF6", type: "open" },
        { name: "Proposal Sent", probability: 75, color: "#F59E0B", type: "open" },
        { name: "Retainer Kickoff (Won)", probability: 100, color: "#10B981", type: "won" },
        { name: "Proposal Passed", probability: 0, color: "#EF4444", type: "lost" },
      ],
    },
    healthcare: {
      fields: [
        { entityType: "contact", key: "patient_uhid", label: "Patient UHID / ID", fieldType: "text", isRequired: true, order: 1 },
        { entityType: "contact", key: "blood_group", label: "Blood Group", fieldType: "dropdown", options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], order: 2 },
        { entityType: "deal", key: "treatment_dept", label: "Clinical Specialty", fieldType: "dropdown", options: ["Cardiology", "Orthopedics", "Dermatology", "Dental", "General Medicine"], order: 1 },
        { entityType: "deal", key: "insurance_provider", label: "TPA / Insurance Provider", fieldType: "text", order: 2 },
      ],
      pipelineStages: [
        { name: "Patient Inquiry", probability: 20, color: "#3B82F6", type: "open" },
        { name: "Consultation Booked", probability: 50, color: "#8B5CF6", type: "open" },
        { name: "Diagnosis & Plan", probability: 75, color: "#F59E0B", type: "open" },
        { name: "Treatment Completed (Won)", probability: 100, color: "#10B981", type: "won" },
        { name: "Consultation Cancelled", probability: 0, color: "#EF4444", type: "lost" },
      ],
    },
  };

  const blueprint = blueprints[industryKey];
  if (!blueprint) throw new Error("Invalid industry blueprint");

  // 1. Provision Custom Fields
  for (const field of blueprint.fields) {
    const existing = await db.query.customFieldDefinitions.findFirst({
      where: and(
        eq(customFieldDefinitions.orgId, orgId),
        eq(customFieldDefinitions.entityType, field.entityType),
        eq(customFieldDefinitions.key, field.key)
      ),
    });

    if (!existing) {
      await db.insert(customFieldDefinitions).values({
        orgId,
        entityType: field.entityType,
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        options: field.options || [],
        isRequired: Boolean(field.isRequired),
        order: field.order || 0,
      });
    }
  }

  // 2. Provision Dedicated Industry Pipeline safely (without FK conflicts)
  const pipelineTitle = `${industryKey.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} Pipeline`;

  // Unset previous default pipelines
  await db
    .update(pipelines)
    .set({ isDefault: false })
    .where(eq(pipelines.orgId, orgId));

  // Create new dedicated vertical pipeline
  const [newPipe] = await db
    .insert(pipelines)
    .values({
      orgId,
      name: pipelineTitle,
      isDefault: true,
    })
    .returning();

  for (let i = 0; i < blueprint.pipelineStages.length; i++) {
    const st = blueprint.pipelineStages[i];
    await db.insert(stages).values({
      pipelineId: newPipe.id,
      name: st.name,
      order: i + 1,
      probability: st.probability,
      color: st.color,
      type: st.type,
    });
  }

  await db.insert(activities).values({
    orgId,
    type: "system",
    body: `Applied 1-Click Industry Blueprint: ${pipelineTitle} with customized fields and stage model.`,
    source: "manual",
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/deals");
  return { success: true, blueprint: industryKey };
}
