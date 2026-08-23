import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import OrdersClient from "./orders-client";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <OrdersClient user={session.user} />;
}
