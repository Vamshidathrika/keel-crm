"use client";

import React from "react";
import { Sparkles, Activity, ShieldAlert, Newspaper, Play, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AgentFleetSummaryProps {
  onTriggerSweep: (type: string) => void;
  triggeringAgent: string | null;
}

const AGENTS = [
  {
    type: "prospector",
    name: "Prospector AI",
    role: "Lead Intelligence & ICP Scoring",
    description: "Calculates mathematical lead score, company size, and buying authority.",
    icon: Sparkles,
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    type: "deal_doctor",
    name: "Deal Doctor AI",
    role: "Pipeline Sentinel & Risk Audit",
    description: "Detects deal stagnation, overdue close dates, and queues revival playbooks.",
    icon: Activity,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    type: "guardian",
    name: "Account Guardian AI",
    role: "Churn Prevention & Contract Renewal",
    description: "Monitors account activity gaps and triggers client check-in sequences.",
    icon: ShieldAlert,
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    type: "briefing",
    name: "Executive Briefing AI",
    role: "Daily Revenue Synthesis",
    description: "Delivers daily summaries of won deals, high-risk opportunities, and cash flow.",
    icon: Newspaper,
    color: "text-purple-500 bg-purple-500/10",
  },
];

export function AgentFleetSummary({
  onTriggerSweep,
  triggeringAgent,
}: AgentFleetSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {AGENTS.map((agent) => {
        const Icon = agent.icon;
        const isRunning = triggeringAgent === agent.type;

        return (
          <Card key={agent.type} className="hover:shadow-md transition-all flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${agent.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500">
                  READY
                </span>
              </div>
              <CardTitle className="text-sm font-semibold pt-2 text-foreground">
                {agent.name}
              </CardTitle>
              <p className="text-[11px] font-medium text-primary">{agent.role}</p>
              <CardDescription className="text-xs text-muted-foreground pt-1">
                {agent.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isRunning}
                onClick={() => onTriggerSweep(agent.type)}
                className="w-full text-xs h-8 gap-1.5"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Run Audit Sweep
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
