import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api/auth";
import { resolveOrCreateCompany } from "@/lib/crm/companies";
import { eq, and, or } from "drizzle-orm";

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "contacts:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : body.contacts || body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Payload must be an array or contain an array of contacts (max 100 items)." },
        { status: 400 }
      );
    }

    if (items.length > 100) {
      return NextResponse.json(
        { error: "Batch size limit exceeded. Max 100 contacts per request." },
        { status: 400 }
      );
    }

    const orgId = authResult.orgId!;
    const created: any[] = [];
    const skipped: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.firstName || typeof item.firstName !== "string") {
        errors.push({ index: i, error: "Missing required 'firstName'" });
        continue;
      }

      try {
        // Duplicate check on email if provided
        if (item.email) {
          const existing = await db.query.contacts.findFirst({
            where: and(eq(contacts.orgId, orgId), eq(contacts.email, item.email.trim().toLowerCase())),
          });
          if (existing) {
            skipped.push({ index: i, id: existing.id, email: item.email, reason: "Duplicate email" });
            continue;
          }
        }

        const resolvedCompanyId = await resolveOrCreateCompany(orgId, {
          companyId: item.companyId,
          companyName: item.companyName,
          email: item.email,
          website: item.website,
          city: item.city,
          state: item.state,
          country: item.country,
          customFields: item.customFields,
        });

        const [newContact] = await db
          .insert(contacts)
          .values({
            orgId,
            firstName: item.firstName.trim(),
            lastName: item.lastName?.trim() || null,
            email: item.email?.trim() || null,
            phone: item.phone?.trim() || null,
            whatsapp: item.whatsapp?.trim() || null,
            title: item.title?.trim() || null,
            department: item.department?.trim() || null,
            seniorityLevel: item.seniorityLevel || null,
            buyingRole: item.buyingRole || null,
            preferredChannel: item.preferredChannel || "email",
            linkedinUrl: item.linkedinUrl?.trim() || null,
            timezone: item.timezone?.trim() || null,
            city: item.city?.trim() || null,
            state: item.state?.trim() || null,
            country: item.country?.trim() || null,
            postalCode: item.postalCode?.trim() || null,
            companyId: resolvedCompanyId,
            source: item.source || "import",
            tags: Array.isArray(item.tags) ? item.tags : [],
            customFields: item.customFields || {},
            score: typeof item.score === "number" ? item.score : 35,
          })
          .returning();

        created.push(newContact);
      } catch (err: any) {
        errors.push({ index: i, error: err.message || "Failed to insert" });
      }
    }

    if (created.length > 0) {
      await db.insert(activities).values({
        orgId,
        type: "system",
        body: `Batch ingested ${created.length} contacts via Platform API.`,
        source: "bridge",
      });
    }

    return NextResponse.json(
      {
        total: items.length,
        createdCount: created.length,
        skippedCount: skipped.length,
        errorCount: errors.length,
        created,
        skipped,
        errors,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process batch request" }, { status: 500 });
  }
}
