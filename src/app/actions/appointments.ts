"use server";

import { db } from "@/db";
import { appointments, activities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAppointments() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.appointments.findMany({
    where: eq(appointments.orgId, session.user.orgId),
    with: { contact: true },
    orderBy: [desc(appointments.dateTime)],
  });
}

export async function createAppointment(data: {
  clientName: string;
  serviceType: string;
  dateTime: string;
  status?: string;
  notes?: string;
  contactId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  const [newApt] = await db
    .insert(appointments)
    .values({
      orgId,
      clientName: data.clientName.trim(),
      serviceType: data.serviceType.trim(),
      dateTime: data.dateTime.trim(),
      status: data.status || "Scheduled",
      notes: data.notes || null,
      contactId: data.contactId || null,
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "meeting",
    body: `Appointment scheduled with ${newApt.clientName} (${newApt.serviceType}) on ${newApt.dateTime}`,
    source: "manual",
  });

  revalidatePath("/dashboard/appointments");
  return newApt;
}

export async function updateAppointmentStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [updated] = await db
    .update(appointments)
    .set({ status })
    .where(and(eq(appointments.id, id), eq(appointments.orgId, session.user.orgId)))
    .returning();

  revalidatePath("/dashboard/appointments");
  return updated;
}
