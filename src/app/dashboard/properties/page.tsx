import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProperties } from "@/app/actions/properties";
import PropertiesClient from "./properties-client";

export default async function PropertiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialProps = await getProperties();
  return <PropertiesClient user={session.user} initialProperties={initialProps} />;
}
