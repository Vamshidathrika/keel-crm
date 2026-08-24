import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRevenueMetrics } from "@/app/actions/revenue";
import RevenueClient from "./revenue-client";

export default async function RevenuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const revenueData = await getRevenueMetrics();
  return <RevenueClient user={session.user} initialData={revenueData} />;
}
