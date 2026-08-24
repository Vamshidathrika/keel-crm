import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getShipments } from "@/app/actions/shipments";
import ShipmentsClient from "./shipments-client";

export default async function ShipmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialShipments = await getShipments();
  return <ShipmentsClient user={session.user} initialShipments={initialShipments} />;
}
