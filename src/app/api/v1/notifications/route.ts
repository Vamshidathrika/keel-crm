import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "notifications:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const isRead = searchParams.get("isRead");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(notifications.orgId, orgId)];
  if (isRead !== null && isRead !== undefined && isRead !== "") {
    conditions.push(eq(notifications.isRead, isRead === "true"));
  }

  const results = await db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(notifications.createdAt)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "notifications:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { title, body: notifBody, type = "info", link, userId } = body;

    if (!title || !notifBody) {
      return NextResponse.json({ error: "Fields 'title' and 'body' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newNotif] = await db
      .insert(notifications)
      .values({
        orgId,
        userId: userId || null,
        title: title.trim(),
        body: notifBody.trim(),
        type,
        link: link || null,
        isRead: false,
      })
      .returning();

    return NextResponse.json({ data: newNotif }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create notification" }, { status: 500 });
  }
}
