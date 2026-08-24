import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, activities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/auth";

export async function GET(req: Request) {
  const authResult = await authenticateApiKey(req, "appointments:read");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const status = searchParams.get("status");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const orgId = authResult.orgId!;
  const conditions = [eq(appointments.orgId, orgId)];
  if (contactId) conditions.push(eq(appointments.contactId, contactId));
  if (status) conditions.push(eq(appointments.status, status));

  const results = await db.query.appointments.findMany({
    where: and(...conditions),
    with: { contact: true },
    orderBy: [desc(appointments.dateTime)],
    limit,
  });

  return NextResponse.json({ data: results, count: results.length });
}

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "appointments:write");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { clientName, serviceType, dateTime, contactId, status = "Scheduled", notes } = body;

    if (!clientName || !serviceType || !dateTime) {
      return NextResponse.json({ error: "Fields 'clientName', 'serviceType', and 'dateTime' are required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const [newAppointment] = await db
      .insert(appointments)
      .values({
        orgId,
        clientName: clientName.trim(),
        serviceType: serviceType.trim(),
        dateTime,
        contactId: contactId || null,
        status,
        notes: notes || null,
      })
      .returning();

    await db.insert(activities).values({
      orgId,
      type: "system",
      relatedContactId: contactId || null,
      body: `Appointment booked: ${serviceType} with ${clientName} on ${dateTime}`,
      source: "bridge",
    });

    return NextResponse.json({ data: newAppointment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to book appointment" }, { status: 500 });
  }
}
