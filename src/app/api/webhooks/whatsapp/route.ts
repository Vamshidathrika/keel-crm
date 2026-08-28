import { NextResponse } from "next/server";
import { db } from "@/db";
import { messageRecords, contacts, activities, organizations } from "@/db/schema";
import { eq, or } from "drizzle-orm";

/**
 * WhatsApp Cloud API Webhook Verification Endpoint (GET)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "keel_whatsapp_verify_token_default";

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge || "", { status: 200 });
  }

  return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 });
}

/**
 * Inbound WhatsApp Message Handler (POST)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Standard WhatsApp Business Cloud API Payload Structure
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    if (!message) {
      // Return 200 to acknowledge delivery receipts or status updates
      return NextResponse.json({ status: "ignored_or_status_update" }, { status: 200 });
    }

    const fromPhone = message.from; // e.g. "919876543210"
    const messageText = message.text?.body || message.caption || "[Media attachment]";

    // 1. Resolve default organization for incoming webhook
    const org = await db.query.organizations.findFirst();
    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 500 });
    }

    const orgId = org.id;

    // 2. Find or match contact by phone number
    const formattedPhone = fromPhone.startsWith("+") ? fromPhone : `+${fromPhone}`;
    let contact = await db.query.contacts.findFirst({
      where: or(
        eq(contacts.phone, fromPhone),
        eq(contacts.phone, formattedPhone),
        eq(contacts.whatsapp, fromPhone),
        eq(contacts.whatsapp, formattedPhone)
      ),
    });

    if (!contact) {
      const contactName = changes?.contacts?.[0]?.profile?.name || `WhatsApp Lead (${fromPhone.slice(-4)})`;
      const [newContact] = await db
        .insert(contacts)
        .values({
          orgId,
          firstName: contactName,
          phone: formattedPhone,
          whatsapp: formattedPhone,
          source: "api_bridge",
          tags: ["inbound", "whatsapp"],
        })
        .returning();
      contact = newContact;
    }

    // 3. Record message in database
    const [msgRecord] = await db
      .insert(messageRecords)
      .values({
        orgId,
        contactId: contact.id,
        direction: "inbound",
        type: "whatsapp",
        text: messageText,
        status: "delivered",
      })
      .returning();

    // 4. Log timeline activity
    await db.insert(activities).values({
      orgId,
      type: "whatsapp",
      relatedContactId: contact.id,
      body: `Incoming WhatsApp from ${contact.firstName}: "${messageText}"`,
      source: "bridge",
    });

    return NextResponse.json({ success: true, messageId: msgRecord.id }, { status: 201 });
  } catch (err: any) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ error: err.message || "Webhook processing error" }, { status: 500 });
  }
}
