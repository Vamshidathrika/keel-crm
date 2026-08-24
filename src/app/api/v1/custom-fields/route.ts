import { NextResponse } from "next/server";
import { db } from "@/db";
import { customFieldDefinitions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "custom_fields:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") as any;

  const orgId = authResult.orgId!;
  const conditions = [eq(customFieldDefinitions.orgId, orgId)];
  if (entityType && ["contact", "company", "deal"].includes(entityType)) {
    conditions.push(eq(customFieldDefinitions.entityType, entityType));
  }

  const results = await db.query.customFieldDefinitions.findMany({
    where: and(...conditions),
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "custom_fields:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { label, name, key, fieldType = "text", entityType = "contact", isRequired = false, options = [] } = body;

    const finalLabel = label || name;
    if (!finalLabel || !key) {
      return NextResponse.json({ error: "Fields 'label' (or 'name') and 'key' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newDef] = await db
      .insert(customFieldDefinitions)
      .values({
        orgId,
        label: finalLabel.trim(),
        key: key.trim(),
        fieldType: ["text", "number", "date", "select", "boolean"].includes(fieldType) ? fieldType : "text",
        entityType: ["contact", "company", "deal"].includes(entityType) ? entityType : "contact",
        isRequired: Boolean(isRequired),
        options,
      })
      .returning();

    return NextResponse.json({ data: newDef }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to define custom field" }, { status: 500 });
  }
}
