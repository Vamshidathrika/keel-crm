"use server";

import { db } from "@/db";
import { quotations, clients, activities, deals } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getQuotes() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.quotations.findMany({
    where: eq(quotations.orgId, session.user.orgId),
    with: { client: true, deal: true },
    orderBy: [desc(quotations.createdAt)],
  });
}

export async function createQuote(data: {
  title: string;
  clientName: string;
  amount: number;
  items?: Array<{ name: string; qty: number; price: number }>;
  dealId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  let client = await db.query.clients.findFirst({
    where: and(eq(clients.orgId, orgId), eq(clients.name, data.clientName.trim())),
  });

  if (!client) {
    const [newClient] = await db
      .insert(clients)
      .values({
        orgId,
        name: data.clientName.trim(),
        portalToken: `pt_${crypto.randomUUID()}`,
      })
      .returning();
    client = newClient;
  }

  const items = data.items || [{ name: data.title, qty: 1, price: data.amount }];

  const [quote] = await db
    .insert(quotations)
    .values({
      orgId,
      clientId: client.id,
      dealId: data.dealId || null,
      title: data.title.trim(),
      items,
      total: data.amount,
      status: "draft",
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "note",
    body: `Generated CPQ Quotation "${quote.title}" (#${quote.id}) for ₹${quote.total.toLocaleString()}`,
    source: "manual",
  });

  revalidatePath("/dashboard/quotes");
  return quote;
}

export async function updateQuoteStatus(id: string, status: "draft" | "sent" | "accepted" | "rejected") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [updated] = await db
    .update(quotations)
    .set({ status })
    .where(and(eq(quotations.id, id), eq(quotations.orgId, session.user.orgId)))
    .returning();

  revalidatePath("/dashboard/quotes");
  return updated;
}
