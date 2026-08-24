import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrders } from "@/app/actions/orders";
import OrdersClient from "./orders-client";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialOrders = await getOrders();
  return <OrdersClient user={session.user} initialOrders={initialOrders} />;
}
