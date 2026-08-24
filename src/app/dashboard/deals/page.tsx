import React from "react";
import { getDeals } from "@/app/actions/deals";
import { getPipelines } from "@/app/actions/pipelines";
import { getContacts } from "@/app/actions/contacts";
import { getCompanies } from "@/app/actions/companies";
import { getOrgDetails } from "@/server/actions/branding";
import DealsClient from "./deals-client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const pipelinesData = await getPipelines().catch(() => []);
  const orgDetails = await getOrgDetails().catch(() => null);

  // Find default pipeline or use first
  const defaultPipeline = pipelinesData.find((p) => p.isDefault) || pipelinesData[0];
  const dealsData = defaultPipeline ? await getDeals(defaultPipeline.id).catch(() => []) : [];

  const contactsData = await getContacts().catch(() => []);
  const companiesData = await getCompanies().catch(() => []);

  return (
    <DealsClient
      initialDeals={dealsData}
      pipelines={pipelinesData}
      contacts={contactsData}
      companies={companiesData}
      currentUser={session.user}
      businessType={orgDetails?.businessType || "b2b_saas"}
    />
  );
}
