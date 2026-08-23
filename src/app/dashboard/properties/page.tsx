import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PropertiesClient from "./properties-client";

export default async function PropertiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <PropertiesClient user={session.user} />;
}
