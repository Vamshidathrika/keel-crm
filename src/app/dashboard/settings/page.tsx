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

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  // Query settings based on role authorization with resilient fallbacks
  const [
    pipelinesData,
    automationsData,
    teamData,
    apiKeysData,
    webhooksData,
    auditLogsData,
    brandingData,
    widgetsData,
  ] = await Promise.all([
    getPipelines().catch(() => []),
    getAutomations().catch(() => []),
    (role === "admin" || role === "manager") ? getTeamMembers().catch(() => []) : Promise.resolve([]),
    role === "admin" ? getApiKeys().catch(() => []) : Promise.resolve([]),
    role === "admin" ? getWebhooks().catch(() => []) : Promise.resolve([]),
    (role === "admin" || role === "manager") ? getAuditLogs().catch(() => []) : Promise.resolve([]),
    role === "admin" ? getBrandingConfig().catch(() => ({})) : Promise.resolve({}),
    role === "admin" ? getOrgWidgets().catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <SettingsClient
      pipelines={pipelinesData || []}
      team={teamData || []}
      apiKeys={apiKeysData || []}
      webhooks={webhooksData || []}
      auditLogs={auditLogsData || []}
      automations={automationsData || []}
      currentUser={session.user}
      branding={brandingData || {}}
      orgWidgets={widgetsData || []}
    />
  );
}
