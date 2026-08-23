import React from "react";
import { getPipelines } from "@/app/actions/pipelines";
import { getTeamMembers } from "@/app/actions/team";
import { getApiKeys } from "@/app/actions/apikeys";
import { getWebhooks } from "@/app/actions/webhooks";
import { getAuditLogs } from "@/app/actions/audit";
import { getAutomations } from "@/app/actions/automations";
import { getBrandingConfig } from "@/server/actions/branding";
import { getOrgWidgets } from "@/server/actions/widgets";
import SettingsClient from "./settings-client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  // Query settings based on role authorization
  const pipelinesData = await getPipelines();
  const automationsData = await getAutomations();

  const teamData = (role === "admin" || role === "manager") ? await getTeamMembers() : [];
  const apiKeysData = role === "admin" ? await getApiKeys() : [];
  const webhooksData = role === "admin" ? await getWebhooks() : [];
  const auditLogsData = (role === "admin" || role === "manager") ? await getAuditLogs() : [];

  // White-label data (admin only)
  const brandingData = role === "admin" ? await getBrandingConfig() : {};
  const widgetsData = role === "admin" ? await getOrgWidgets() : [];

  return (
    <SettingsClient
      pipelines={pipelinesData}
      team={teamData}
      apiKeys={apiKeysData}
      webhooks={webhooksData}
      auditLogs={auditLogsData}
      automations={automationsData}
      currentUser={session.user}
      branding={brandingData}
      orgWidgets={widgetsData}
    />
  );
}
