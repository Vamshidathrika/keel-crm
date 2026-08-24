"use client";

import React, { useState, useTransition } from "react";
import {
  Bot,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  RotateCw,
  Settings2,
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  approveAgentAction,
  rejectAgentAction,
  triggerManualSweep,
  updateAgentConfig,
} from "@/app/actions/agents";
import { toast } from "sonner";

interface AgentHubClientProps {
  user: any;
  initialQueue: any[];
  initialRuns: any[];
  initialConfigs: any[];
}

export default function AgentHubClient({
  user,
  initialQueue,
  initialRuns,
  initialConfigs,
}: AgentHubClientProps) {
  const [queue, setQueue] = useState(initialQueue);
  const [runs, setRuns] = useState(initialRuns);
  const [configs, setConfigs] = useState(initialConfigs);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSweeping, setIsSweeping] = useState(false);

  const pendingCount = queue.length;
  const criticalCount = queue.filter((q) => q.severity === "critical").length;

  const handleApprove = (actionId: string) => {
    startTransition(async () => {
      try {
        await approveAgentAction(actionId);
        setQueue((prev) => prev.filter((q) => q.id !== actionId));
        toast.success("Agent action approved and executed successfully!");
      } catch (err: any) {
        toast.error(err.message || "Failed to approve action");
      }
    });
  };

  const handleReject = (actionId: string) => {
    startTransition(async () => {
      try {
        await rejectAgentAction(actionId);
        setQueue((prev) => prev.filter((q) => q.id !== actionId));
        toast.info("Action dismissed.");
      } catch (err: any) {
        toast.error(err.message || "Failed to dismiss action");
      }
    });
  };

  const handleRunSweep = async () => {
    setIsSweeping(true);
    try {
      const res = await triggerManualSweep();
      toast.success(`Autonomous sweep completed! Audited ${res.processedDeals} deals.`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to run sweep");
    } finally {
      setIsSweeping(false);
    }
  };

  const handleToggleMode = async (agentType: any, currentMode: string) => {
    const newMode = currentMode === "supervised" ? "full_auto" : "supervised";
    try {
      await updateAgentConfig(agentType, { executionMode: newMode as any });
      setConfigs((prev) =>
        prev.map((c) => (c.agentType === agentType ? { ...c, executionMode: newMode } : c))
      );
      toast.success(`Updated ${agentType} to ${newMode === "full_auto" ? "Full-Auto" : "Supervised"} mode.`);
    } catch (err: any) {
      toast.error("Failed to update config");
    }
  };

  const agentMetadata: Record<string, { name: string; icon: any; role: string; color: string }> = {
    prospector: {
      name: "Prospector Agent",
      icon: Sparkles,
      role: "Autonomous Account Research & Lead Scoring",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    deal_doctor: {
      name: "Deal Doctor",
      icon: Activity,
      role: "Pipeline Velocity Sentinel & Risk Diagnostician",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    guardian: {
      name: "Account Guardian",
      icon: ShieldCheck,
      role: "Payment Telemetry & Retention Monitor",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    briefing: {
      name: "Executive Briefing",
      icon: TrendingUp,
      role: "Daily Pipeline Rollup & Prioritization",
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Agent Control Hub</h1>
            <Badge variant="outline" className="gap-1.5 bg-primary/5 text-primary border-primary/20 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Autonomous Engine Active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Supervise autonomous specialist agents, approve high-leverage interventions, and inspect reasoning traces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRunSweep}
            disabled={isSweeping}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
          >
            <RotateCw className={`h-4 w-4 ${isSweeping ? "animate-spin" : ""}`} />
            {isSweeping ? "Sweeping Pipeline..." : "Run Autonomous Sweep"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Pending Approvals
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {pendingCount}
              <Clock className="h-5 w-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {criticalCount > 0 ? `${criticalCount} critical actions waiting` : "All high-impact actions reviewed"}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Active Agents
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              4 / 4
              <Bot className="h-5 w-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Prospector, Deal Doctor, Guardian, Briefing
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Total Agent Runs
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {runs.length}
              <Zap className="h-5 w-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Continuous background audit traces
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Avg Reasoning Speed
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              184 ms
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Low-latency tool execution & RAG
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="queue" className="gap-2 text-xs font-medium relative">
            Action Approval Queue
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2 text-xs font-medium">
            Agent Swarm Squad
          </TabsTrigger>
          <TabsTrigger value="runs" className="gap-2 text-xs font-medium">
            Live Reasoning & Audit Stream
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Action Approval Queue */}
        <TabsContent value="queue" className="space-y-4">
          {queue.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold">Approval Queue Clear</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                Your autonomous agents are monitoring pipeline telemetry in the background. High-impact recommendations will appear here for 1-click review.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {queue.map((item) => {
                const meta = agentMetadata[item.agentType] || {
                  name: item.agentType,
                  color: "text-gray-500 bg-gray-100",
                };
                return (
                  <Card key={item.id} className="border shadow-sm overflow-hidden transition-all hover:border-primary/40">
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${meta.color}`}>
                            {meta.name}
                          </span>
                          {item.severity === "critical" ? (
                            <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                              Critical Risk
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                              {item.severity}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <h4 className="text-base font-semibold text-foreground tracking-tight">{item.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(item.id)}
                          disabled={isPending}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(item.id)}
                          disabled={isPending}
                          className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve & Execute
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Agent Swarm Squad */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {configs.map((cfg) => {
              const meta = agentMetadata[cfg.agentType] || {
                name: cfg.agentType,
                role: "Specialist Autonomous Agent",
                icon: Bot,
                color: "text-blue-500 bg-blue-50",
              };
              const Icon = meta.icon;
              const isSupervised = cfg.executionMode === "supervised";

              return (
                <Card key={cfg.id} className="p-5 border shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${meta.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{meta.name}</h4>
                        <p className="text-xs text-muted-foreground">{meta.role}</p>
                      </div>
                    </div>
                    <Badge variant={cfg.isEnabled ? "outline" : "secondary"} className="text-[10px]">
                      {cfg.isEnabled ? "Active" : "Paused"}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-foreground">Mode: </span>
                      <span className={isSupervised ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                        {isSupervised ? "Supervised (HITL Queue)" : "Full-Auto (Self-Driving)"}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleMode(cfg.agentType, cfg.executionMode)}
                      className="text-xs h-7 gap-1"
                    >
                      <Settings2 className="h-3 w-3" />
                      Switch to {isSupervised ? "Full-Auto" : "Supervised"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 3: Live Reasoning & Audit Stream */}
        <TabsContent value="runs" className="space-y-3">
          {runs.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No recent agent runs recorded yet. Trigger a sweep above to start telemetry.
            </Card>
          ) : (
            runs.map((run) => {
              const meta = agentMetadata[run.agentType] || { name: run.agentType, color: "text-gray-500" };
              const isExpanded = expandedRunId === run.id;

              return (
                <Card key={run.id} className="border shadow-sm text-xs transition-all">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-semibold text-foreground capitalize flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                        {meta.name}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Target: {run.targetEntityType} #{run.targetEntityId.slice(0, 8)}
                      </Badge>
                      <span className="text-muted-foreground truncate max-w-md">{run.summary}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-muted-foreground">{run.executionDurationMs || 120}ms</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t bg-muted/20 space-y-2">
                      <h5 className="font-semibold text-xs text-foreground">Chain of Thought & Observations:</h5>
                      <div className="space-y-1 bg-background p-3 rounded-lg border font-mono text-[11px] text-muted-foreground">
                        {(run.thoughtProcess || []).map((thought: string, idx: number) => (
                          <div key={idx} className="leading-relaxed">
                            {thought}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
