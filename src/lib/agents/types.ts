export type AgentType = "prospector" | "deal_doctor" | "guardian" | "briefing";
export type ExecutionMode = "full_auto" | "supervised";
export type AgentRunStatus = "running" | "completed" | "failed" | "requires_approval";
export type ActionSeverity = "info" | "warning" | "critical";

export interface AgentToolResult<T = any> {
  status: "success" | "warning" | "error";
  summary: string;
  data?: T;
  nextSteps?: string[];
  error?: string;
}

export interface AgentExecutionContext {
  orgId: string;
  agentType: AgentType;
  executionMode: ExecutionMode;
  model: string;
  triggerSource: "event" | "sweep" | "manual";
}

export interface ProposedAction {
  title: string;
  description: string;
  actionType: "create_task" | "update_deal_health" | "adjust_probability" | "draft_proposal" | "tag_entity" | "reassign_owner" | "move_stage" | "trigger_webhook" | "custom";
  actionPayload: Record<string, any>;
  severity?: ActionSeverity;
}

export interface AgentRunOutput {
  runId: string;
  status: AgentRunStatus;
  confidenceScore: number;
  thoughtProcess: string[];
  summary: string;
  toolsInvoked: Array<{ tool: string; params: any; result: any }>;
  actionsProposed: ProposedAction[];
  executionDurationMs: number;
}
