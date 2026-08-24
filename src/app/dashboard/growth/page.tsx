import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getGrowthMetrics } from "@/app/actions/growth";
import GrowthClient from "./growth-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Growth & Revenue Flywheel — Keel CRM",
  description: "Net revenue retention, predictable revenue forecasting, and referral loop engine.",
};

export default async function GrowthPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialData = await getGrowthMetrics().catch(() => null);

  return <GrowthClient user={session.user} initialData={initialData} />;
}
