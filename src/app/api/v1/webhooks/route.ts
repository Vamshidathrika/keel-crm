import { NextResponse } from "next/server";
import { db } from "@/db";
import { webhooks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";
import crypto from "crypto";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "webhooks:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;
  const results = await db.query.webhooks.findMany({
    where: eq(webhooks.orgId, orgId),
    orderBy: [desc(webhooks.createdAt)],
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "webhooks:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { targetUrl, url, eventTypes = ["*"], events, secret } = body;

    const finalUrl = targetUrl || url;
    const finalEvents = eventTypes || events || ["*"];

    if (!finalUrl || typeof finalUrl !== "string" || !finalUrl.startsWith("http")) {
      return NextResponse.json({ error: "Field 'targetUrl' (or 'url') must be a valid HTTP(S) URL." }, { status: 400 });
    }

    const orgId = authResult.orgId!;
    const signingSecret = secret || crypto.randomBytes(24).toString("hex");

    const [newWebhook] = await db
      .insert(webhooks)
      .values({
        orgId,
        targetUrl: finalUrl.trim(),
        eventTypes: finalEvents,
        secret: signingSecret,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ data: newWebhook }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to register webhook" }, { status: 500 });
  }
}
