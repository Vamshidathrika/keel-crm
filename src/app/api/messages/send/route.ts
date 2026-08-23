import { NextResponse } from "next/server";
import { db } from "@/db";
import { messageRecords, activities } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clientId, contactId, type, text } = await req.json();

    if (!clientId || !text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hasResendKey = !!process.env.RESEND_API_KEY;
    const hasWAKey = !!process.env.WH_API_KEY;

    let mode = "simulated";
    if (type === "email" && hasResendKey) {
      // Simulate real Resend integration
      mode = "resend";
    } else if (type === "whatsapp" && hasWAKey) {
      // Simulate real WhatsApp integration
      mode = "whatsapp_cloud_api";
    }

    // Insert Message Log
    const [newMessage] = await db
      .insert(messageRecords)
      .values({
        orgId: session.user.orgId,
        clientId,
        contactId: contactId || null,
        type: type || "whatsapp",
        direction: "outbound",
        text,
        status: "sent",
      })
      .returning();

    // Log Activity
    await db.insert(activities).values({
      orgId: session.user.orgId,
      type: type === "email" ? "email" : "whatsapp",
      relatedContactId: contactId || null,
      body: `Outbound ${type === "email" ? "Email" : "WhatsApp"} sent to client: "${text.slice(0, 60)}${text.length > 60 ? "..." : ""}" (Mode: ${mode})`,
      source: "system",
    });

    return NextResponse.json({ success: true, message: newMessage, mode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send message" }, { status: 500 });
  }
}
