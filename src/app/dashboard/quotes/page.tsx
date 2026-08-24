import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getQuotes } from "@/app/actions/quotes";
import QuotesClient from "./quotes-client";

export default async function QuotesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialQuotes = await getQuotes();
  return <QuotesClient user={session.user} initialQuotes={initialQuotes} />;
}
