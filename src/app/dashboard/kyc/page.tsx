import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import KycClient from "./kyc-client";

export default async function KycPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <KycClient user={session.user} />;
}
