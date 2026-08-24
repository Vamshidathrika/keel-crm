"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Zap, GitBranch, Bot, Sparkles, MessageCircle, DollarSign, ShieldAlert, CheckCircle2 } from "lucide-react";

export const TriggerNode = memo(({ data }: { data: any }) => {
  return (
    <div className="bg-card border-2 border-emerald-500/80 rounded-xl p-3.5 shadow-lg min-w-[220px] max-w-[260px] text-xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
          <Zap className="w-4 h-4 fill-emerald-500/20" />
          <span>TRIGGER</span>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-mono font-semibold">
          {data.badge || "EVENT"}
        </span>
      </div>
      <div>
        <p className="font-semibold text-foreground text-xs">{data.label || "When Event Occurs"}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{data.description || "Inbound trigger stream"}</p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-emerald-500 border-2 border-background"
      />
    </div>
  );
});
TriggerNode.displayName = "TriggerNode";

export const ConditionNode = memo(({ data }: { data: any }) => {
  return (
    <div className="bg-card border-2 border-amber-500/80 rounded-xl p-3.5 shadow-lg min-w-[220px] max-w-[260px] text-xs space-y-2">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-amber-500 border-2 border-background"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
          <GitBranch className="w-4 h-4" />
          <span>FILTER CONDITION</span>
        </div>
        <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-mono font-semibold">
          RULE
        </span>
      </div>
      <div>
        <p className="font-semibold text-foreground text-xs">{data.label || "Check Condition"}</p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 bg-muted/60 px-1.5 py-0.5 rounded">
          {data.ruleText || "score >= 75"}
        </p>
      </div>
      <div className="flex justify-between items-center pt-1 text-[10px] text-muted-foreground font-semibold">
        <span className="text-emerald-500">True ➔</span>
        <span className="text-destructive">➔ False</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3 h-3 bg-emerald-500 border-2 border-background"
      />
    </div>
  );
});
ConditionNode.displayName = "ConditionNode";

export const ActionNode = memo(({ data }: { data: any }) => {
  const isAgent = data.actionType === "agent";

  return (
    <div className="bg-card border-2 border-primary/80 rounded-xl p-3.5 shadow-lg min-w-[220px] max-w-[260px] text-xs space-y-2">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-primary">
          {isAgent ? <Bot className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{isAgent ? "AGENT HAND" : "EXECUTE ACTION"}</span>
        </div>
        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-semibold">
          {data.agentType?.toUpperCase() || "ACTION"}
        </span>
      </div>
      <div>
        <p className="font-semibold text-foreground text-xs">{data.label || "Action Execution"}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{data.description || "Autonomous CRM mutation"}</p>
      </div>
      {data.lastRun && (
        <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-mono pt-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Last Executed: {data.lastRun}</span>
        </div>
      )}
    </div>
  );
});
ActionNode.displayName = "ActionNode";
