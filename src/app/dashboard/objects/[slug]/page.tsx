import React from "react";
import { getCustomObjectRecords } from "@/app/actions/custom-objects";
import { getCustomFieldDefinitions } from "@/app/actions/custom-fields";
import { getContacts } from "@/app/actions/contacts";
import { getDeals } from "@/app/actions/deals";
import CustomObjectClient from "./custom-object-client";
import { notFound } from "next/navigation";

interface CustomObjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CustomObjectPage({ params }: CustomObjectPageProps) {
  const { slug } = await params;
  const { definition, records } = await getCustomObjectRecords(slug);

  if (!definition) {
    notFound();
  }

  const [customFields, contacts, deals] = await Promise.all([
    getCustomFieldDefinitions("custom_object", definition.id),
    getContacts(),
    getDeals(),
  ]);

  return (
    <CustomObjectClient
      definition={definition}
      initialRecords={records}
      customFields={customFields}
      contacts={contacts}
      deals={deals}
    />
  );
}
