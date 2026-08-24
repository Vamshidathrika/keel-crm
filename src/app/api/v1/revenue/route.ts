import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, invoices, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "revenue:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;

  const allDeals = await db.query.deals.findMany({
    where: eq(deals.orgId, orgId),
    with: { stage: true },
  });

  const allInvoices = await db.query.invoices.findMany({
    where: eq(invoices.orgId, orgId),
  });

  const allPayments = await db.query.payments.findMany({
    where: eq(payments.orgId, orgId),
  });

  const totalPipelineValue = allDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const weightedPipelineValue = allDeals.reduce((sum, d) => sum + (d.value * (d.probability || 10)) / 100, 0);
  const wonRevenue = allDeals
    .filter((d) => d.stage?.type === "won")
    .reduce((sum, d) => sum + (d.value || 0), 0);

  const totalInvoiced = allInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalPaidInvoices = allInvoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalOverdueInvoices = allInvoices
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalCollections = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return NextResponse.json({
    currency: "INR",
    pipeline: {
      totalDeals: allDeals.length,
      totalValue: totalPipelineValue,
      weightedValue: Math.round(weightedPipelineValue),
      wonRevenue,
    },
    invoicing: {
      totalInvoiced,
      totalCollected: totalPaidInvoices,
      totalOverdue: totalOverdueInvoices,
      unpaidInvoicesCount: allInvoices.filter((i) => i.status === "unpaid" || i.status === "overdue").length,
    },
    collections: {
      totalPaymentsRecorded: allPayments.length,
      totalAmountCollected: totalCollections,
    },
  });
}
