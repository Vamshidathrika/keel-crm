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
  ShieldAlert,
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  approveAgentAction,
  rejectAgentAction,
  triggerManualSweep,
  updateAgentConfig,
  runWaterfallEnrichmentTest,
} from "@/app/actions/agents";
import { toast } from "sonner";

interface AgentHubClientProps {
  user: any;
  initialQueue: any[];
  initialRuns: any[];
  initialConfigs: any[];
  initialBattlecards?: any[];
}

export default function AgentHubClient({
  user,
  initialQueue,
  initialRuns,
  initialConfigs,
  initialBattlecards = [],
}: AgentHubClientProps) {
  const [queue, setQueue] = useState(initialQueue);
  const [runs, setRuns] = useState(initialRuns);
  const [configs, setConfigs] = useState(initialConfigs);
  const [battlecards, setBattlecards] = useState(initialBattlecards);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSweeping, setIsSweeping] = useState(false);

  // Waterfall Enrichment Sandbox State
  const [waterfallDomain, setWaterfallDomain] = useState("");
  const [waterfallCompany, setWaterfallCompany] = useState("");
  const [waterfallEmail, setWaterfallEmail] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);
  const [waterfallResult, setWaterfallResult] = useState<any>(null);

  const handleRunWaterfall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waterfallDomain && !waterfallCompany && !waterfallEmail) return;

    setIsEnriching(true);
    try {
      const res = await runWaterfallEnrichmentTest({
        domain: waterfallDomain.trim(),
        companyName: waterfallCompany.trim(),
        contactEmail: waterfallEmail.trim(),
      });
      setWaterfallResult(res);
      toast.success("Waterfall enrichment completed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to run waterfall enrichment");
    } finally {
      setIsEnriching(false);
    }
  };

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
        <TabsList className="bg-muted/60 p-1 flex flex-wrap">
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
          <TabsTrigger value="waterfall" className="gap-2 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Waterfall Enrichment (Clay)
          </TabsTrigger>
          <TabsTrigger value="battlecards" className="gap-2 text-xs font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            Objection Battlecards (Gong)
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

        {/* Tab 3: Clay-Style Waterfall Enrichment Sandbox */}
        <TabsContent value="waterfall" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <Card className="p-6 border shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Waterfall Lead & Account Enrichment
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Cascades through 3 enrichment tiers: DNS heuristics ➔ Technographics ➔ Gemini 2.5 Dossier.
                </p>
              </div>

              <form onSubmit={handleRunWaterfall} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Company Domain</Label>
                  <Input
                    placeholder="e.g. stripe.com or maersk.com"
                    value={waterfallDomain}
                    onChange={(e) => setWaterfallDomain(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Company Name (Optional)</Label>
                  <Input
                    placeholder="e.g. Stripe Inc"
                    value={waterfallCompany}
                    onChange={(e) => setWaterfallCompany(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact Email (Optional)</Label>
                  <Input
                    placeholder="e.g. alex@company.com"
                    value={waterfallEmail}
                    onChange={(e) => setWaterfallEmail(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isEnriching || (!waterfallDomain && !waterfallCompany && !waterfallEmail)}
                  className="w-full text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xs mt-2"
                >
                  {isEnriching ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      Cascading Waterfall Tiers...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Run Waterfall Enrichment
                    </>
                  )}
                </Button>
              </form>
            </Card>

            {/* Results Display */}
            <div className="lg:col-span-2 space-y-4">
              {waterfallResult ? (
                <Card className="p-6 border shadow-xs space-y-5 bg-gradient-to-br from-card to-muted/20">
                  <div className="flex items-center justify-between pb-3 border-b">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-foreground">Enrichment Dossier</h4>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                          Tier {waterfallResult.tierReached} Reached
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Confidence: {(waterfallResult.provenance.confidence * 100).toFixed(0)}% • Sources: {waterfallResult.provenance.sources.join(" ➔ ")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-background border">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">ICP Fit</span>
                      <p className="text-xs font-bold text-primary mt-1">{waterfallResult.data.icpFit}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background border">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Domain Health</span>
                      <p className="text-xs font-bold text-foreground mt-1 capitalize">{waterfallResult.data.domainHealth}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background border">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Corporate Email</span>
                      <p className="text-xs font-bold text-foreground mt-1">
                        {waterfallResult.data.isCorporateEmail ? "Verified Corporate" : "Free / Public"}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-background border">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Headcount Estimate</span>
                      <p className="text-xs font-bold text-foreground mt-1">{waterfallResult.data.employeeEstimate}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Executive Summary</span>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed bg-background p-3 rounded-lg border">
                        {waterfallResult.data.summary}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Tailored Sales Hook</span>
                      <p className="text-xs text-primary font-medium mt-1 bg-primary/5 p-3 rounded-lg border border-primary/20">
                        🎯 {waterfallResult.data.suggestedHook}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Detected Technographic Stack</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {waterfallResult.data.techStack.map((tech: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-muted text-foreground border">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-12 text-center border-dashed flex flex-col items-center justify-center">
                  <Sparkles className="w-8 h-8 text-amber-500/50 mb-3" />
                  <h4 className="text-sm font-semibold">Live Waterfall Sandbox Ready</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Enter any company domain or email to simulate Clay-style multi-tier waterfall intelligence live.
                  </p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Gong-Style Competitor Objection Battlecards */}
        <TabsContent value="battlecards" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold tracking-tight">Competitor Battlecards & Objection Rebuttal</h3>
              <p className="text-xs text-muted-foreground">
                Battlecards injected automatically by Deal Doctor AI when competitor mentions are detected in deals or call transcripts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {battlecards.map((card) => (
              <Card key={card.id} className="p-6 border shadow-xs space-y-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between pb-3 border-b">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-mono">
                      COMPETITOR OVERRIDE
                    </span>
                    <h4 className="text-lg font-bold text-foreground">{card.competitorName}</h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    Live Deal Defense
                  </Badge>
                </div>

                {card.pricingComparison && (
                  <div className="p-3 rounded-lg bg-muted/40 border text-xs">
                    <span className="font-semibold text-foreground">Pricing Trap: </span>
                    <span className="text-muted-foreground">{card.pricingComparison}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <h5 className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mb-1.5">Our Strategic Strengths</h5>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground text-[11px]">
                      {(card.ourStrengths || []).map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
                    <h5 className="font-bold text-rose-600 dark:text-rose-400 text-xs mb-1.5">Their Critical Weaknesses</h5>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground text-[11px]">
                      {(card.theirWeaknesses || []).map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h5 className="font-bold text-xs text-foreground uppercase tracking-wider">Objection Rebuttal Scripts</h5>
                  {(card.objectionHandlers || []).map((obj: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-background border space-y-1">
                      <p className="text-xs font-semibold text-foreground">Q: &ldquo;{obj.objection}&rdquo;</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-bold text-primary">A: </span>
                        {obj.response}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 5: Live Reasoning & Audit Stream */}
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
