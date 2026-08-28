import React from "react";
import { getContacts } from "@/app/actions/contacts";
import { getCompanies } from "@/app/actions/companies";
import ContactsClient from "./contacts-client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [contactsData, companiesData] = await Promise.all([
    getContacts().catch(() => []),
    getCompanies().catch(() => []),
  ]);

  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading Contacts...</div>}>
      <ContactsClient
        initialContacts={contactsData}
        companies={companiesData}
        currentUser={session.user}
      />
    </React.Suspense>
  );
}
