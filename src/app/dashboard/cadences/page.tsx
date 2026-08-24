import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCadences } from "@/app/actions/cadences";
import CadencesClient from "./cadences-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sales Cadences & Sequences — Keel CRM",
  description: "Automated multi-step outreach tracks and daily rep execution cockpit.",
};

export default async function CadencesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialData = await getCadences().catch(() => []);

  return <CadencesClient user={session.user} initialCadences={initialData} />;
}
