import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgentActionQueue, getAgentRuns, getAgentConfigs, getCompetitorBattlecards } from "@/app/actions/agents";
import AgentHubClient from "./agent-hub-client";

export const dynamic = "force-dynamic";

export default async function AgentHubPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [queue, runs, configs, battlecards] = await Promise.all([
    getAgentActionQueue().catch(() => []),
    getAgentRuns().catch(() => []),
    getAgentConfigs().catch(() => []),
    getCompetitorBattlecards().catch(() => []),
  ]);

  return (
    <AgentHubClient
      user={session.user}
      initialQueue={queue || []}
      initialRuns={runs || []}
      initialConfigs={configs || []}
      initialBattlecards={battlecards || []}
    />
  );
}
