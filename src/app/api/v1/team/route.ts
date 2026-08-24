import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";
import crypto from "crypto";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "team:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const orgId = authResult.orgId!;
  const members = await db.query.users.findMany({
    where: eq(users.orgId, orgId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [desc(users.createdAt)],
  });

  return NextResponse.json({ data: members, count: members.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "team:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { name, email, role = "rep", password = "TemporaryPassword123!" } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Fields 'name' and 'email' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

    const [newUser] = await db
      .insert(users)
      .values({
        orgId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        isActive: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ data: newUser }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add team member" }, { status: 500 });
  }
}
