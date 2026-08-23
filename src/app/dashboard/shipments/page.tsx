import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ShipmentsClient from "./shipments-client";

export default async function ShipmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <ShipmentsClient user={session.user} />;
}
