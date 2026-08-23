import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppointmentsClient from "./appointments-client";

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <AppointmentsClient user={session.user} />;
}
