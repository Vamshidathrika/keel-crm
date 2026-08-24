import { ProposedAction } from "../types";

export interface AgentGraphState {
  orgId: string;
  agentType: "prospector" | "deal_doctor" | "guardian" | "briefing";
  targetEntityType: "contact" | "company" | "deal" | "org";
  targetEntityId: string;
  triggerSource: "event" | "sweep" | "manual";
  executionMode: "full_auto" | "supervised";
  
  // State accumulation channels
  thoughtProcess: string[];
  toolsInvoked: Array<{ tool: string; params: any; result: any }>;
  actionsProposed: ProposedAction[];
  
  // Entity specific context
  entityData?: Record<string, any>;
  summary: string;
  confidenceScore: number;
  healthFlags: string[];
  score: number;
  status: "running" | "completed" | "failed" | "requires_approval";
  error?: string;
  
  // Routing checkpoint
  nextStep?: string;
}

export function createInitialGraphState(
  orgId: string,
  agentType: "prospector" | "deal_doctor" | "guardian" | "briefing",
  targetEntityType: "contact" | "company" | "deal" | "org",
  targetEntityId: string,
  executionMode: "full_auto" | "supervised" = "supervised",
  triggerSource: "event" | "sweep" | "manual" = "event"
): AgentGraphState {
  return {
    orgId,
    agentType,
    targetEntityType,
    targetEntityId,
    triggerSource,
    executionMode,
    thoughtProcess: [],
    toolsInvoked: [],
    actionsProposed: [],
    summary: "",
    confidenceScore: 0.9,
    healthFlags: [],
    score: 50,
    status: "running",
  };
}
