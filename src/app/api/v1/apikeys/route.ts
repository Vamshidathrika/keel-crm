import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { authenticateApiKey, hashApiKey } from "@/lib/api/auth";
import crypto from "crypto";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "apikeys:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;
  const keys = await db.query.apiKeys.findMany({
    where: and(eq(apiKeys.orgId, orgId), isNull(apiKeys.revokedAt)),
    columns: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: [desc(apiKeys.createdAt)],
  });

  return NextResponse.json({ data: keys, count: keys.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "apikeys:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { name, scopes = ["*"] } = body;

    if (!name) {
      return NextResponse.json({ error: "Field 'name' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;
    const rawKey = `keel_sk_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 15);

    const [createdKey] = await db
      .insert(apiKeys)
      .values({
        orgId,
        name: name.trim(),
        keyHash,
        keyPrefix,
        scopes,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        createdAt: apiKeys.createdAt,
      });

    return NextResponse.json({
      data: {
        ...createdKey,
        apiKey: rawKey,
      },
      message: "Please store this API key safely. It will not be shown again.",
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create API key" }, { status: 500 });
  }
}
