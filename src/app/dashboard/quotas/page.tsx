import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getQuotaDashboard } from "@/app/actions/quotas";
import QuotasClient from "./quotas-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sales Quotas & Commission Hub — Keel CRM",
  description: "Rep revenue targets, quota attainment %, and automated commission calculators.",
};

export default async function QuotasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialData = await getQuotaDashboard().catch(() => null);

  return <QuotasClient user={session.user} initialData={initialData} />;
}
