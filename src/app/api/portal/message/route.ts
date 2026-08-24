import { NextResponse } from "next/server";
import { db } from "@/db";
import { messageRecords, clients, activities } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { token, text } = await req.json();

    if (!token || !text?.trim()) {
      return NextResponse.json({ error: "Missing required token or text" }, { status: 400 });
    }

    // 1. Verify Client by portalToken
    const client = await db.query.clients.findFirst({
      where: eq(clients.portalToken, token),
    });

    if (!client) {
      return NextResponse.json({ error: "Invalid client portal token" }, { status: 401 });
    }

    // 2. Insert Inbound Message from Client into Database
    const [inboundMsg] = await db
      .insert(messageRecords)
      .values({
        orgId: client.orgId,
        clientId: client.id,
        contactId: client.contactId,
        type: "whatsapp",
        direction: "inbound",
        text: text.trim(),
        status: "delivered",
      })
      .returning();

    // 3. Log Inbound Timeline Activity
    await db.insert(activities).values({
      orgId: client.orgId,
      type: "whatsapp",
      relatedContactId: client.contactId,
      body: `Inbound Portal Message from ${client.name}: "${inboundMsg.text}"`,
      source: "manual",
    });

    // 4. Create Real Autonomous Partner Acknowledgment in Database
    const [autoReply] = await db
      .insert(messageRecords)
      .values({
        orgId: client.orgId,
        clientId: client.id,
        contactId: client.contactId,
        type: "whatsapp",
        direction: "outbound",
        text: `🤖 Automatic Partner Reply: Thank you for your update, ${client.name}! Your message has been logged in the project timeline and the team has been notified.`,
        status: "delivered",
      })
      .returning();

    return NextResponse.json({
      success: true,
      inbound: inboundMsg,
      reply: autoReply,
    });
  } catch (err: any) {
    console.error("Portal message error:", err);
    return NextResponse.json({ error: err.message || "Failed to process portal message" }, { status: 500 });
  }
}
