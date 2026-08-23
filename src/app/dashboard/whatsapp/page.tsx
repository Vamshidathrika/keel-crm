import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WhatsappClient from "./whatsapp-client";
import { db } from "@/db";
import { contacts, deals } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function WhatsappPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch some contacts and deals to hook into conversational choices
  const contactsData = await db.query.contacts.findMany({
    where: eq(contacts.orgId, session.user.orgId),
    limit: 20,
  });

  const dealsData = await db.query.deals.findMany({
    where: eq(deals.orgId, session.user.orgId),
    limit: 20,
  });

  return (
    <WhatsappClient
      user={session.user}
      contacts={contactsData}
      deals={dealsData}
    />
  );
}
