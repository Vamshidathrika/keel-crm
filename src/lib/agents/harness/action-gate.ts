/**
 * Action Risk Classifier & Human-in-the-Loop Gating Policy.
 * Classifies proposed autonomous actions and determines whether they require manual approval.
 */

export type ActionRiskLevel = "low" | "medium" | "high" | "critical";

export interface ActionGatePolicy {
  riskLevel: ActionRiskLevel;
  requiresApproval: boolean;
  rationale: string;
}

const CRITICAL_ACTION_TYPES = new Set([
  "reassign_owner",
  "adjust_probability",
  "move_stage",
  "trigger_webhook",
]);

/**
 * Evaluates an agent action proposal against organizational risk rules.
 */
export function evaluateActionGate(
  actionType: string,
  payload: Record<string, any> = {},
  executionMode: "full_auto" | "supervised" = "supervised"
): ActionGatePolicy {
  // If org is in supervised mode, ALL external mutations require human approval
  if (executionMode === "supervised") {
    const isCritical = CRITICAL_ACTION_TYPES.has(actionType);
    return {
      riskLevel: isCritical ? "critical" : "medium",
      requiresApproval: true,
      rationale: isCritical
        ? `Action "${actionType}" alters sensitive CRM state and requires human authorization.`
        : `Organization is in SUPERVISED execution mode.`,
    };
  }

  // Full-Auto mode: Only critical actions require human sign-off
  if (actionType === "reassign_owner") {
    return {
      riskLevel: "critical",
      requiresApproval: true,
      rationale: "Account owner reassignment requires team lead review.",
    };
  }

  if (actionType === "move_stage" && (payload.stageType === "lost" || payload.stageType === "won")) {
    return {
      riskLevel: "critical",
      requiresApproval: true,
      rationale: "Moving deals to terminal Won/Lost states requires sales manager approval.",
    };
  }

  if (actionType === "adjust_probability" && Math.abs((payload.delta || 0)) > 30) {
    return {
      riskLevel: "high",
      requiresApproval: true,
      rationale: "Large probability shift (>30%) requires deal desk confirmation.",
    };
  }

  return {
    riskLevel: "low",
    requiresApproval: false,
    rationale: `Action "${actionType}" is authorized for autonomous background execution.`,
  };
}
