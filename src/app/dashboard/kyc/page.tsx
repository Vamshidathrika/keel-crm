import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getKycRecords } from "@/app/actions/kyc";
import KycClient from "./kyc-client";

export default async function KycPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialKyc = await getKycRecords();
  return <KycClient user={session.user} initialRecords={initialKyc} />;
}
