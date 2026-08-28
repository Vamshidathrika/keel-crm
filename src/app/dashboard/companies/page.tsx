import React from "react";
import { getCompanies } from "@/app/actions/companies";
import CompaniesClient from "./companies-client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const initialCompanies = await getCompanies().catch(() => []);

  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading Companies...</div>}>
      <CompaniesClient initialCompanies={initialCompanies} currentUser={session.user} />
    </React.Suspense>
  );
}
