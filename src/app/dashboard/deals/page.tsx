import React from "react";
import { getDeals } from "@/app/actions/deals";
import { getPipelines } from "@/app/actions/pipelines";
import { getContacts } from "@/app/actions/contacts";
import { getCompanies } from "@/app/actions/companies";
import { getOrgDetails } from "@/server/actions/branding";
import DealsClient from "./deals-client";
import { auth } from "@/lib/auth";

export default async function DealsPage() {
  const session = await auth();
  const pipelinesData = await getPipelines();
  const orgDetails = await getOrgDetails();

  // Find default pipeline or use first
  const defaultPipeline = pipelinesData.find((p) => p.isDefault) || pipelinesData[0];
  const dealsData = defaultPipeline ? await getDeals(defaultPipeline.id) : [];

  const contactsData = await getContacts();
  const companiesData = await getCompanies();

  return (
    <DealsClient
      initialDeals={dealsData}
      pipelines={pipelinesData}
      contacts={contactsData}
      companies={companiesData}
      currentUser={session?.user}
      businessType={orgDetails?.businessType || "logistics"}
    />
  );
}
