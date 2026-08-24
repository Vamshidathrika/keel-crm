"use server";

import { db } from "@/db";
import { messageRecords, contacts, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getMessageThreads() {
  const session = await auth();
  if (!session?.user) return [];

  const msgs = await db.query.messageRecords.findMany({
    where: eq(messageRecords.orgId, session.user.orgId),
    with: { contact: true },
    orderBy: [desc(messageRecords.createdAt)],
    limit: 100,
  });

  return msgs;
}

export async function sendMessage(data: {
  contactId?: string;
  clientId?: string;
  content: string;
  channel?: "whatsapp" | "email";
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  const [msg] = await db
    .insert(messageRecords)
    .values({
      orgId,
      clientId: data.clientId || null,
      contactId: data.contactId || null,
      type: data.channel || "whatsapp",
      direction: "outbound",
      text: data.content.trim(),
      status: "delivered",
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: (data.channel as any) || "whatsapp",
    relatedContactId: data.contactId || null,
    body: `Outbound ${data.channel?.toUpperCase() || "WHATSAPP"}: "${msg.text}"`,
    source: "manual",
  });

  revalidatePath("/dashboard/whatsapp");
  return msg;
}
