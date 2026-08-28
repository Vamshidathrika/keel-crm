import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, followups, activities } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized cron execution." }, { status: 401 });
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Flip unpaid invoices to overdue
    const overdueInvoices = await db
      .update(invoices)
      .set({ status: "overdue" })
      .where(and(eq(invoices.status, "unpaid"), lt(invoices.dueDate, todayStr)))
      .returning();

    // 2. Flip pending followups to overdue
    const overdueFollowups = await db
      .update(followups)
      .set({ status: "overdue" })
      .where(and(eq(followups.status, "pending"), lt(followups.dueDate, todayStr)))
      .returning();

    // 3. Log activities for any newly marked overdue items
    for (const inv of overdueInvoices) {
      await db.insert(activities).values({
        orgId: inv.orgId,
        type: "system",
        body: `Invoice ${inv.invoiceNumber} (Amount: ₹${inv.amount.toLocaleString("en-IN")}) has passed its due date (${inv.dueDate}) and is now marked OVERDUE.`,
        source: "system",
      });
    }

    for (const flw of overdueFollowups) {
      await db.insert(activities).values({
        orgId: flw.orgId,
        type: "system",
        body: `Follow-up task "${flw.title}" has passed its due date (${flw.dueDate}) and is now marked OVERDUE.`,
        source: "system",
      });
    }

    return NextResponse.json({
      success: true,
      overdueInvoicesCount: overdueInvoices.length,
      overdueFollowupsCount: overdueFollowups.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute sweep" }, { status: 500 });
  }
}
