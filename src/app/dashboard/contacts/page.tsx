import React from "react";
import { getContacts } from "@/app/actions/contacts";
import { getCompanies } from "@/app/actions/companies";
import ContactsClient from "./contacts-client";
import { auth } from "@/lib/auth";

export default async function ContactsPage() {
  const session = await auth();
  const contactsData = await getContacts();
  const companiesData = await getCompanies();

  return (
    <ContactsClient
      initialContacts={contactsData}
      companies={companiesData}
      currentUser={session?.user}
    />
  );
}
