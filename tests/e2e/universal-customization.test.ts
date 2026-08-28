import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { db } from "@/db";
import {
  organizations,
  users,
  pipelines,
  stages,
  contacts,
  deals,
  customFieldDefinitions,
  customObjectDefinitions,
  customObjectRecords,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { buildDynamicZodSchema } from "@/lib/custom-fields-validator";

describe("🌟 Universal Customizable CRM Engine (Full-Stack & Validation)", () => {
  const testOrgId = "org_test_custom_engine_" + Date.now();
  const testUserId = "usr_test_custom_admin_" + Date.now();

  before(async () => {
    // Setup test organization & admin user
    await db.insert(organizations).values({
      id: testOrgId,
      name: "Acme Universal Corp",
      slug: "acme-universal-" + Date.now(),
    });

    await db.insert(users).values({
      id: testUserId,
      orgId: testOrgId,
      email: `admin_${Date.now()}@acme.com`,
      name: "Admin User",
      role: "admin",
      passwordHash: "hashed_pass_test",
    });

    // Create default pipeline
    const [pipe] = await db.insert(pipelines).values({
      orgId: testOrgId,
      name: "Standard Sales Pipeline",
      isDefault: true,
    }).returning();

    await db.insert(stages).values({
      pipelineId: pipe.id,
      name: "Discovery",
      order: 1,
      probability: 20,
      color: "#3b82f6",
      type: "open",
    });
  });

  after(async () => {
    // Clean up test data
    await db.delete(customObjectRecords).where(eq(customObjectRecords.orgId, testOrgId));
    await db.delete(customObjectDefinitions).where(eq(customObjectDefinitions.orgId, testOrgId));
    await db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.orgId, testOrgId));
    await db.delete(deals).where(eq(deals.orgId, testOrgId));
    await db.delete(contacts).where(eq(contacts.orgId, testOrgId));
    await db.delete(stages).where(eq(stages.pipelineId, testOrgId));
    await db.delete(pipelines).where(eq(pipelines.orgId, testOrgId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  });

  it("1. Should define and persist dynamic custom fields across multiple data types", async () => {
    const [field1] = await db.insert(customFieldDefinitions).values({
      orgId: testOrgId,
      entityType: "deal",
      key: "property_type",
      label: "Property Type",
      fieldType: "dropdown",
      options: ["1 BHK", "2 BHK", "Penthouse", "Villa"],
      isRequired: true,
      order: 1,
    }).returning();

    const [field2] = await db.insert(customFieldDefinitions).values({
      orgId: testOrgId,
      entityType: "deal",
      key: "carpet_sqft",
      label: "Carpet Area (SqFt)",
      fieldType: "number",
      isRequired: false,
      order: 2,
    }).returning();

    assert.strictEqual(field1.key, "property_type");
    assert.strictEqual(field1.fieldType, "dropdown");
    assert.deepStrictEqual(field1.options, ["1 BHK", "2 BHK", "Penthouse", "Villa"]);
    assert.strictEqual(field2.fieldType, "number");
  });

  it("2. Should compile runtime Zod schema and validate dynamic field payloads", () => {
    const defs = [
      { key: "property_type", fieldType: "dropdown", options: ["1 BHK", "2 BHK", "Villa"], isRequired: true },
      { key: "carpet_sqft", fieldType: "number", isRequired: true },
      { key: "rera_approved", fieldType: "boolean", isRequired: false },
    ];

    const zodSchema = buildDynamicZodSchema(defs);

    // Valid Payload
    const validData = {
      property_type: "Villa",
      carpet_sqft: 2800,
      rera_approved: true,
    };
    const validResult = zodSchema.safeParse(validData);
    assert.strictEqual(validResult.success, true);

    // Invalid Payload (Wrong Enum Value)
    const invalidData = {
      property_type: "Tent", // Not in enum
      carpet_sqft: 2800,
    };
    const invalidResult = zodSchema.safeParse(invalidData);
    assert.strictEqual(invalidResult.success, false);
  });

  it("3. Should model a dynamic Custom Business Entity (Properties) and record instances", async () => {
    // 1. Create Custom Object Definition
    const [objDef] = await db.insert(customObjectDefinitions).values({
      orgId: testOrgId,
      singularName: "Property",
      pluralName: "Properties",
      slug: "properties",
      description: "Residential real estate listings and inventory",
      icon: "Home",
      primaryFieldKey: "title",
    }).returning();

    assert.strictEqual(objDef.slug, "properties");

    // 2. Create Linked Contact
    const [contact] = await db.insert(contacts).values({
      orgId: testOrgId,
      firstName: "Rahul",
      lastName: "Verma",
      email: "rahul.verma@example.com",
    }).returning();

    // 3. Create Custom Object Record with dynamic JSON attributes
    const [record] = await db.insert(customObjectRecords).values({
      orgId: testOrgId,
      objectDefId: objDef.id,
      title: "Skyline Tower - Penthouse 18A",
      attributes: {
        bedrooms: 4,
        sqft: 3450,
        price: 24000000,
        amenities: ["Infinity Pool", "Private Terrace", "EV Charger"],
      },
      linkedContactId: contact.id,
    }).returning();

    assert.strictEqual(record.title, "Skyline Tower - Penthouse 18A");
    assert.strictEqual(record.attributes.bedrooms, 4);
    assert.strictEqual(record.attributes.price, 24000000);
    assert.strictEqual(record.linkedContactId, contact.id);

    // 4. Query record with relations
    const queried = await db.query.customObjectRecords.findFirst({
      where: eq(customObjectRecords.id, record.id),
      with: {
        definition: true,
        linkedContact: true,
      },
    });

    assert.ok(queried);
    assert.strictEqual(queried?.definition.pluralName, "Properties");
    assert.strictEqual(queried?.linkedContact?.firstName, "Rahul");
  });

  it("4. Should store custom attributes in Deals and Contacts records without schema migration", async () => {
    const [pipe] = await db.query.pipelines.findMany({
      where: eq(pipelines.orgId, testOrgId),
    });
    const [stage] = await db.query.stages.findMany({
      where: eq(stages.pipelineId, pipe.id),
    });

    const [deal] = await db.insert(deals).values({
      orgId: testOrgId,
      pipelineId: pipe.id,
      stageId: stage.id,
      title: "Freight Contract #9910",
      value: 1200000,
      customFields: {
        origin_port: "INNSA - Nhava Sheva",
        destination_port: "NLRTM - Rotterdam",
        container_mode: "40ft High Cube",
        customs_duty_inr: 85000,
      },
    }).returning();

    assert.strictEqual(deal.customFields.origin_port, "INNSA - Nhava Sheva");
    assert.strictEqual(deal.customFields.destination_port, "NLRTM - Rotterdam");
    assert.strictEqual(deal.customFields.customs_duty_inr, 85000);
  });
});
