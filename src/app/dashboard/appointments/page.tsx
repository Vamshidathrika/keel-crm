import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAppointments } from "@/app/actions/appointments";
import AppointmentsClient from "./appointments-client";

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialAppointments = await getAppointments();
  return <AppointmentsClient user={session.user} initialAppointments={initialAppointments} />;
}
