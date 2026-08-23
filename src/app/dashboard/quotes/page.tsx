import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import QuotesClient from "./quotes-client";

export default async function QuotesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <QuotesClient user={session.user} />;
}
