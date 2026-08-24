"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Zap, GitBranch, Bot, Sparkles, MessageCircle, DollarSign, ShieldAlert, CheckCircle2, ArrowDown } from "lucide-react";

export const TriggerNode = memo(({ data }: { data: any }) => {
  return (
    <div className="bg-card border-2 border-emerald-500/90 rounded-xl p-4 shadow-md min-w-[280px] max-w-[320px] text-xs space-y-2.5 transition-all hover:shadow-emerald-500/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 tracking-wide text-[11px]">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 fill-emerald-500/30" />
          </div>
          <span>STEP 1: TRIGGER EVENT</span>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-mono font-bold">
          {data.badge || "INBOUND"}
        </span>
      </div>
      <div>
        <p className="font-semibold text-foreground text-xs">{data.label || "When Event Occurs"}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{data.description || "Inbound event listener"}</p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3.5 h-3.5 bg-emerald-500 border-2 border-background shadow-sm hover:scale-125 transition-transform"
      />
    </div>
  );
});
TriggerNode.displayName = "TriggerNode";

export const ConditionNode = memo(({ data }: { data: any }) => {
  return (
    <div className="bg-card border-2 border-amber-500/90 rounded-xl p-4 shadow-md min-w-[280px] max-w-[320px] text-xs space-y-2.5 transition-all hover:shadow-amber-500/10">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3.5 h-3.5 bg-amber-500 border-2 border-background shadow-sm hover:scale-125 transition-transform"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 tracking-wide text-[11px]">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
            <GitBranch className="w-3.5 h-3.5" />
          </div>
          <span>STEP 2: FILTER RULE</span>
        </div>
        <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-mono font-bold">
          BRANCH
        </span>
      </div>
      <div>
        <p className="font-semibold text-foreground text-xs">{data.label || "Check Condition"}</p>
        <div className="mt-1 bg-muted/70 px-2.5 py-1 rounded font-mono text-[10px] text-foreground border border-border/50">
          {data.ruleText || "score >= 75"}
        </div>
      </div>
      <div className="flex justify-between items-center pt-1 text-[10px] font-semibold">
        <span className="text-emerald-500 flex items-center gap-0.5">✓ Match (True)</span>
        <span className="text-muted-foreground flex items-center gap-0.5">✗ Else (False)</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3.5 h-3.5 bg-emerald-500 border-2 border-background shadow-sm hover:scale-125 transition-transform"
      />
    </div>
  );
});
ConditionNode.displayName = "ConditionNode";

export const ActionNode = memo(({ data }: { data: any }) => {
  const isAgent = data.agentType === "agent";

  return (
    <div className="bg-card border-2 border-primary/90 rounded-xl p-4 shadow-md min-w-[280px] max-w-[320px] text-xs space-y-2.5 transition-all hover:shadow-primary/10">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3.5 h-3.5 bg-primary border-2 border-background shadow-sm hover:scale-125 transition-transform"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-primary tracking-wide text-[11px]">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            {isAgent ? <Bot className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          </div>
          <span>{isAgent ? "STEP 3: AGENT COGNITION" : "STEP 3: ACTION DISPATCH"}</span>
        </div>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono font-bold">
          {data.agentType?.toUpperCase() || "ACTION"}
        </span>
      </div>
      <div>
        <p className="font-semibold text-foreground text-xs">{data.label || "Action Execution"}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{data.description || "Autonomous CRM action"}</p>
      </div>
      {data.lastRun && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-mono pt-1 border-t border-border/50">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Status: Verified ({data.lastRun})</span>
        </div>
      )}
    </div>
  );
});
ActionNode.displayName = "ActionNode";
