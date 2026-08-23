import React from "react";
import { getCompanies } from "@/app/actions/companies";
import CompaniesClient from "./companies-client";
import { auth } from "@/lib/auth";

export default async function CompaniesPage() {
  const session = await auth();
  const companiesData = await getCompanies();

  return (
    <CompaniesClient
      initialCompanies={companiesData}
      currentUser={session?.user}
    />
  );
}
