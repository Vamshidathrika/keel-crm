import { NextResponse } from "next/server";
import { db } from "@/db";
import { kycRecords, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "kyc:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const complianceStatus = searchParams.get("complianceStatus");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(kycRecords.orgId, orgId)];
  if (contactId) conditions.push(eq(kycRecords.contactId, contactId));
  if (complianceStatus) conditions.push(eq(kycRecords.complianceStatus, complianceStatus));

  const results = await db.query.kycRecords.findMany({
    where: and(...conditions),
    with: { contact: true },
    orderBy: [desc(kycRecords.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "kyc:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const {
      customer,
      docType,
      contactId,
      complianceStatus = "Pending Review",
      riskScore = 0,
      expiresAt,
      verifiedBy,
      regulatoryLogs,
    } = body;

    if (!customer || !docType) {
      return NextResponse.json({ error: "Fields 'customer' and 'docType' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newKyc] = await db
      .insert(kycRecords)
      .values({
        orgId,
        customer: customer.trim(),
        docType: docType.trim(),
        contactId: contactId || null,
        complianceStatus,
        riskScore: Number(riskScore) || 0,
        expiresAt: expiresAt || null,
        verifiedBy: verifiedBy?.trim() || null,
        regulatoryLogs: regulatoryLogs || null,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedContactId: contactId || null,
      body: `KYC Compliance document uploaded: ${docType} for ${customer} (${complianceStatus})`,
      source: "bridge",
    });

    return NextResponse.json({ data: newKyc }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create KYC record" }, { status: 500 });
  }
}
