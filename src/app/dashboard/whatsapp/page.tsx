import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WhatsappClient from "./whatsapp-client";
import { db } from "@/db";
import { contacts, deals, messageRecords } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function WhatsappPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const contactsData = await db.query.contacts.findMany({
    where: eq(contacts.orgId, session.user.orgId),
    limit: 50,
  });

  const dealsData = await db.query.deals.findMany({
    where: eq(deals.orgId, session.user.orgId),
    limit: 50,
  });

  const messagesData = await db.query.messageRecords.findMany({
    where: eq(messageRecords.orgId, session.user.orgId),
    orderBy: [desc(messageRecords.createdAt)],
    limit: 100,
  });

  return (
    <WhatsappClient
      user={session.user}
      contacts={contactsData}
      deals={dealsData}
      initialMessages={messagesData}
    />
  );
}
