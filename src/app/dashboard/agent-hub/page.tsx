import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgentActionQueue, getAgentRuns, getAgentConfigs } from "@/app/actions/agents";
import AgentHubClient from "./agent-hub-client";

export default async function AgentHubPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [queue, runs, configs] = await Promise.all([
    getAgentActionQueue(),
    getAgentRuns(),
    getAgentConfigs(),
  ]);

  return (
    <AgentHubClient
      user={session.user}
      initialQueue={queue}
      initialRuns={runs}
      initialConfigs={configs}
    />
  );
}
