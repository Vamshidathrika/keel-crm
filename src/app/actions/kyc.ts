"use server";

import { db } from "@/db";
import { kycRecords, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getKycRecords() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.kycRecords.findMany({
    where: eq(kycRecords.orgId, session.user.orgId),
    with: { contact: true },
    orderBy: [desc(kycRecords.createdAt)],
  });
}

export async function createKycRecord(data: {
  customer: string;
  docType: string;
  complianceStatus?: string;
  regulatoryLogs?: string;
  contactId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  const [record] = await db
    .insert(kycRecords)
    .values({
      orgId,
      customer: data.customer.trim(),
      docType: data.docType.trim(),
      complianceStatus: data.complianceStatus || "Pending Review",
      regulatoryLogs: data.regulatoryLogs || "New document uploaded for compliance audit.",
      contactId: data.contactId || null,
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "system",
    body: `KYC Document Uploaded for ${record.customer}: [${record.docType}] (Status: ${record.complianceStatus})`,
    source: "manual",
  });

  revalidatePath("/dashboard/kyc");
  return record;
}

export async function updateKycStatus(id: string, complianceStatus: string, regulatoryLogs?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [updated] = await db
    .update(kycRecords)
    .set({
      complianceStatus,
      ...(regulatoryLogs ? { regulatoryLogs } : {}),
    })
    .where(and(eq(kycRecords.id, id), eq(kycRecords.orgId, session.user.orgId)))
    .returning();

  revalidatePath("/dashboard/kyc");
  return updated;
}
