import React from "react";
import { notFound } from "next/navigation";
import { getTeamMemberPortalData } from "@/app/actions/team-allocation";
import TeamPortalClient from "./team-portal-client";

interface TeamPortalPageProps {
  params: Promise<{ token: string }>;
}

export default async function TeamPortalPage({ params }: TeamPortalPageProps) {
  const { token } = await params;
  const portalData = await getTeamMemberPortalData(token);

  if (!portalData) {
    notFound();
  }

  return <TeamPortalClient token={token} initialData={portalData} />;
}
