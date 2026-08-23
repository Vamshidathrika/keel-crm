import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, contacts, activities, users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { analyzeTranscript } from "@/app/actions/ai";
import crypto from "crypto";

// Next.js 15/16 background runner
import { after } from "next/server";

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate API Key Bearer Token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }

    const rawKey = authHeader.replace("Bearer ", "").trim();
    const keyHash = hashApiKey(rawKey);

    const apiKeyRecord = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)),
    });

    if (!apiKeyRecord) {
      return NextResponse.json({ error: "Invalid API key or key revoked" }, { status: 401 });
    }

    const { orgId } = apiKeyRecord;

    // 2. Parse payload
    const body = await req.json();
    const {
      type,
      occurredAt,
      contact: contactPayload,
      outcome,
      durationSec,
      transcript,
      metadata,
      source,
      externalId,
    } = body;

    if (!type || !contactPayload?.phone) {
      return NextResponse.json(
        { error: "Required fields missing: type, contact.phone" },
        { status: 400 }
      );
    }

    // 3. Idempotency Check: (orgId, source, externalId)
    if (source && externalId) {
      const existingActivity = await db.query.activities.findFirst({
        where: and(
          eq(activities.orgId, orgId),
          eq(activities.source, source),
          eq(activities.externalId, externalId)
        ),
      });

      if (existingActivity) {
        return NextResponse.json({
          success: true,
          message: "Idempotent hit: activity already processed.",
          activityId: existingActivity.id,
        });
      }
    }

    // 4. Contact Match or Auto-create (phone -> email)
    const phoneClean = contactPayload.phone.trim();
    const emailClean = contactPayload.email?.trim().toLowerCase();

    let matchedContact = await db.query.contacts.findFirst({
      where: and(eq(contacts.orgId, orgId), eq(contacts.phone, phoneClean)),
    });

    if (!matchedContact && emailClean) {
      matchedContact = await db.query.contacts.findFirst({
        where: and(eq(contacts.orgId, orgId), eq(contacts.email, emailClean)),
      });
    }

    if (!matchedContact) {
      // Find first admin/rep in the org to assign contact ownership
      const defaultOwner = await db.query.users.findFirst({
        where: eq(users.orgId, orgId),
      });

      const firstName = contactPayload.name?.split(" ")[0] || "Unknown";
      const lastName = contactPayload.name?.split(" ").slice(1).join(" ") || null;

      const [newContact] = await db
        .insert(contacts)
        .values({
          orgId,
          firstName,
          lastName,
          phone: phoneClean,
          email: emailClean || null,
          source: "api_bridge",
          ownerId: defaultOwner?.id || null,
          score: 30,
        })
        .returning();

      matchedContact = newContact;
    }

    // 5. Append Activity
    const bodyText = `Outbound call outcome: ${outcome || "completed"}. Duration: ${durationSec || 0}s.`;

    const [newActivity] = await db
      .insert(activities)
      .values({
        orgId,
        type,
        relatedContactId: matchedContact.id,
        body: bodyText,
        metadata: {
          outcome,
          duration: durationSec,
          transcript,
          ...(metadata || {}),
        },
        source: "bridge",
        externalId: externalId || null,
        occurredAt: occurredAt || new Date().toISOString(),
      })
      .returning();

    // Update API Key last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, apiKeyRecord.id));

    // 6. Schedule Background AI Pass (Fire and Forget using Next.js after())
    if (transcript && transcript.trim()) {
      after(async () => {
        try {
          console.log(`Scheduling conversation intelligence for contact ${matchedContact!.id}`);
          await analyzeTranscript(matchedContact!.id, transcript);
        } catch (err) {
          console.error("Background AI analyze transcript failed:", err);
        }
      });
    }

    return NextResponse.json({
      success: true,
      activityId: newActivity.id,
      contactId: matchedContact.id,
    });
  } catch (error: any) {
    console.error("Activities API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
