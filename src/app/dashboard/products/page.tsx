import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProducts } from "@/app/actions/products";
import ProductsClient from "./products-client";

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialProducts = await getProducts();
  return <ProductsClient user={session.user} initialProducts={initialProducts} />;
}
