import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, companies, activities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "duplicates:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;
  const allContacts = await db.query.contacts.findMany({
    where: eq(contacts.orgId, orgId),
  });

  const emailMap = new Map<string, typeof allContacts>();
  const phoneMap = new Map<string, typeof allContacts>();
  const duplicateSets: Array<{ matchKey: string; field: "email" | "phone"; records: typeof allContacts }> = [];

  for (const c of allContacts) {
    if (c.email) {
      const email = c.email.toLowerCase();
      const existing = emailMap.get(email) || [];
      existing.push(c);
      emailMap.set(email, existing);
    }
    if (c.phone) {
      const phone = c.phone.trim();
      const existing = phoneMap.get(phone) || [];
      existing.push(c);
      phoneMap.set(phone, existing);
    }
  }

  for (const [email, list] of emailMap.entries()) {
    if (list.length > 1) {
      duplicateSets.push({ matchKey: email, field: "email", records: list });
    }
  }

  for (const [phone, list] of phoneMap.entries()) {
    if (list.length > 1) {
      duplicateSets.push({ matchKey: phone, field: "phone", records: list });
    }
  }

  return NextResponse.json({
    totalDuplicateClusters: duplicateSets.length,
    clusters: duplicateSets,
  });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "duplicates:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { primaryContactId, duplicateContactIds = [] } = body;

    if (!primaryContactId || duplicateContactIds.length === 0) {
      return NextResponse.json({ error: "Fields 'primaryContactId' and 'duplicateContactIds' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    for (const dupId of duplicateContactIds) {
      await db.delete(contacts).where(and(eq(contacts.id, dupId), eq(contacts.orgId, orgId)));
    }

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedContactId: primaryContactId,
      body: `Deduplication merge completed: Merged ${duplicateContactIds.length} duplicate record(s) into primary contact #${primaryContactId}.`,
      source: "bridge",
    });

    return NextResponse.json({ success: true, mergedCount: duplicateContactIds.length, primaryContactId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to merge duplicates" }, { status: 500 });
  }
}
