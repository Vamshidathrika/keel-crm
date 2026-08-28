import React from "react";
import { auth } from "@/lib/auth";
import { getTeamWorkloadSummary, getUnassignedWorkPool } from "@/app/actions/team-allocation";
import { getContacts } from "@/app/actions/contacts";
import { getDeals } from "@/app/actions/deals";
import TeamClient from "./team-client";

export default async function TeamPage() {
  const session = await auth();
  const [workloadData, unassignedPool, contactsData, dealsData] = await Promise.all([
    getTeamWorkloadSummary(),
    getUnassignedWorkPool(),
    getContacts(),
    getDeals(),
  ]);

  return (
    <TeamClient
      initialData={workloadData}
      initialUnassigned={unassignedPool}
      contacts={contactsData}
      deals={dealsData}
      currentUser={session?.user}
    />
  );
}
