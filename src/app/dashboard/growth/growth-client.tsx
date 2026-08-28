"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Zap,
  Repeat,
  ShieldAlert,
  ArrowUpRight,
  Plus,
  Copy,
  Check,
  Percent,
  Sparkles,
  Users,
  Building2,
  DollarSign,
  AlertTriangle,
  Loader2,
  Target,
  ArrowRight,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createReferralLink, triggerUpsellDeal, executeChurnPlaybook } from "@/app/actions/growth";
import { toast } from "sonner";

interface GrowthClientProps {
  user: any;
  initialData: any;
}

export default function GrowthClient({ user, initialData }: GrowthClientProps) {
  const [data, setData] = useState<any>(initialData || {});
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New Referral Link Form State
  const [newReferrerName, setNewReferrerName] = useState("");
  const [newRewardType, setNewRewardType] = useState<"discount_percent" | "credit" | "commission">("discount_percent");
  const [newRewardValue, setNewRewardValue] = useState("15");
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  // Predictable Revenue Simulator State
  const [spearsTarget, setSpearsTarget] = useState(15); // Outbound meetings/mo
  const [netsTarget, setNetsTarget] = useState(40); // Inbound MQLs/mo
  const [seedsTarget, setSeedsTarget] = useState(8); // Referral intros/mo

  const calculatedSimulatedRevenue = React.useMemo(() => {
    const spearsRev = spearsTarget * 0.24 * 120000;
    const netsRev = netsTarget * 0.35 * 65000;
    const seedsRev = seedsTarget * 0.68 * 180000;
    return Math.round(spearsRev + netsRev + seedsRev);
  }, [spearsTarget, netsTarget, seedsTarget]);

  const handleCreateReferralLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReferrerName.trim()) return;

    setIsCreatingLink(true);
    try {
      const res = await createReferralLink({
        referrerName: newReferrerName,
        rewardType: newRewardType,
        rewardValue: parseFloat(newRewardValue) || 15,
      });

      if (res.success && res.link) {
        toast.success("Viral referral link created successfully!");
        setData((prev: any) => ({
          ...prev,
          links: [res.link, ...(prev.links || [])],
        }));
        setIsLinkDialogOpen(false);
        setNewReferrerName("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create referral link.");
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleTriggerUpsell = async (signalId: string) => {
    setLoadingActionId(signalId);
    try {
      const res = await triggerUpsellDeal(signalId);
      if (res.success) {
        toast.success("Expansion Deal provisioned and synced to Sales Pipeline!");
        setData((prev: any) => ({
          ...prev,
          signals: prev.signals.map((s: any) =>
            s.id === signalId ? { ...s, status: "deal_created" } : s
          ),
        }));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create upsell deal.");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleExecutePlaybook = async (signalId: string, playbook: "winback_discount" | "csm_urgent_outreach") => {
    setLoadingActionId(signalId);
    try {
      const res = await executeChurnPlaybook(signalId, playbook);
      if (res.success) {
        toast.success("Guardian Churn Mitigation task assigned to Account Team!");
        setData((prev: any) => ({
          ...prev,
          signals: prev.signals.map((s: any) =>
            s.id === signalId ? { ...s, status: "mitigated" } : s
          ),
        }));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute playbook.");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleCopyLink = (code: string) => {
    const url = `https://keel-crm.vercel.app/p/invite?ref=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    toast.success("Referral invitation link copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const formatINR = (val: number) => `₹${(val || 0).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Business Growth & Revenue Flywheel
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
              RevOps Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Autonomous account expansion radar, Predictable Revenue forecasting (Seeds/Nets/Spears), and viral referral growth loops.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => setIsLinkDialogOpen(true)}
            className="gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Referral Link
          </Button>
        </div>
      </div>

      {/* Top Level Growth KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Net Revenue Retention (NRR)</span>
              <Repeat className="w-4 h-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-500">{data?.nrrScore || 118}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Target: <span className="font-mono text-foreground font-semibold">&gt;110%</span> (World-Class SaaS Benchmark)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Viral Coefficient (K-Factor)</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground font-mono">{data?.kFactor || 0.85}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Referral loop multiplier across clients
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Expansion Pipeline Potential</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {formatINR(
                (data?.expansionAccounts || []).reduce(
                  (sum: number, a: any) => sum + (a.expansionPotential || 0),
                  0
                )
              )}
            </div>
            <p className="text-[11px] text-emerald-500 font-medium mt-1">
              {(data?.expansionAccounts || []).length} accounts ready for upsell
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Guardian Churn Risk Alert</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-rose-500 font-mono">
              {(data?.churnRiskAccounts || []).length} Accounts
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Requires immediate CSM touchpoint
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Growth Modules Tabs */}
      <Tabs defaultValue="expansion" className="space-y-4">
        <TabsList className="bg-muted/40 p-1 border border-border">
          <TabsTrigger value="expansion" className="text-xs gap-1.5">
            <Repeat className="w-3.5 h-3.5" /> NRR & Expansion Radar
          </TabsTrigger>
          <TabsTrigger value="predictable" className="text-xs gap-1.5">
            <Target className="w-3.5 h-3.5" /> Predictable Revenue Simulator
          </TabsTrigger>
          <TabsTrigger value="referrals" className="text-xs gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Viral Referral Links
          </TabsTrigger>
          <TabsTrigger value="churn" className="text-xs gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Guardian Churn Radar
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: NRR & Expansion Radar */}
        <TabsContent value="expansion" className="space-y-4">
          <Card className="border-border/70">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-500" />
                Account Health & Upsell Readiness Radar
              </CardTitle>
              <CardDescription className="text-xs">
                AI continuously monitors customer billing consistency, SLA satisfaction, and project delivery to surface expansion opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              {(data?.signals || []).map((sig: any) => (
                <div
                  key={sig.id}
                  className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{sig.accountName}</span>
                      <Badge
                        variant="outline"
                        className={
                          sig.healthScore >= 80
                            ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5 text-[10px]"
                            : sig.healthScore >= 50
                            ? "border-amber-500/30 text-amber-500 bg-amber-500/5 text-[10px]"
                            : "border-rose-500/30 text-rose-500 bg-rose-500/5 text-[10px]"
                        }
                      >
                        Health Score: {sig.healthScore}/100
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Current MRR: {formatINR(sig.mrrValue)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {sig.expansionReason || sig.churnRiskFactor || "Normal contract operating baseline."}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/75 font-mono">
                      <span>Contract Renewal: {sig.renewalDate || "Rolling Monthly"}</span>
                      <span>•</span>
                      <span suppressHydrationWarning>Last Activity: {new Date(sig.lastTouchpointAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {sig.nrrStatus === "expanding" && (
                      <div className="text-right mr-2 hidden sm:block">
                        <span className="text-[10px] text-muted-foreground uppercase font-mono block">Potential</span>
                        <span className="font-bold text-sm text-emerald-500">{formatINR(sig.expansionPotential)}</span>
                      </div>
                    )}

                    {sig.status === "deal_created" ? (
                      <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/5 py-1 px-3">
                        ✓ Upsell Deal Active
                      </Badge>
                    ) : sig.nrrStatus === "expanding" ? (
                      <Button
                        size="sm"
                        onClick={() => handleTriggerUpsell(sig.id)}
                        disabled={loadingActionId === sig.id}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {loadingActionId === sig.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                        Provision Upsell Deal
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Predictable Revenue Simulator */}
        <TabsContent value="predictable" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Spears (Outbound SDR) */}
            <Card className="border-border/70 bg-card">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-blue-500" /> Spears (Outbound SDR)
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">24% Win Rate</Badge>
                </div>
                <CardDescription className="text-[11px]">
                  High-touch prospecting targeted at ICP decision makers.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Monthly Qualified Meetings:</span>
                  <span className="font-bold font-mono text-sm">{spearsTarget}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={spearsTarget}
                  onChange={(e) => setSpearsTarget(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="p-2.5 rounded-lg bg-muted/20 border border-border text-[11px] space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Est. Closed Deals/Mo:</span>
                    <span className="font-mono text-foreground font-semibold">{(spearsTarget * 0.24).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Projected Outbound Rev:</span>
                    <span className="font-mono text-blue-500 font-bold">{formatINR(spearsTarget * 0.24 * 120000)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nets (Inbound Marketing) */}
            <Card className="border-border/70 bg-card">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" /> Nets (Inbound Marketing)
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">35% Win Rate</Badge>
                </div>
                <CardDescription className="text-[11px]">
                  Website forms, organic search, and campaign leads.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Monthly Inbound Leads:</span>
                  <span className="font-bold font-mono text-sm">{netsTarget}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={netsTarget}
                  onChange={(e) => setNetsTarget(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="p-2.5 rounded-lg bg-muted/20 border border-border text-[11px] space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Est. Closed Deals/Mo:</span>
                    <span className="font-mono text-foreground font-semibold">{(netsTarget * 0.35).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Projected Inbound Rev:</span>
                    <span className="font-mono text-amber-500 font-bold">{formatINR(netsTarget * 0.35 * 65000)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seeds (Customer Referrals) */}
            <Card className="border-border/70 bg-card">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500" /> Seeds (Referrals &amp; VIPs)
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">68% Win Rate</Badge>
                </div>
                <CardDescription className="text-[11px]">
                  Customer referral loops and warm partner introductions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Monthly Client Intros:</span>
                  <span className="font-bold font-mono text-sm">{seedsTarget}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={seedsTarget}
                  onChange={(e) => setSeedsTarget(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="p-2.5 rounded-lg bg-muted/20 border border-border text-[11px] space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Est. Closed Deals/Mo:</span>
                    <span className="font-mono text-foreground font-semibold">{(seedsTarget * 0.68).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Projected Referral Rev:</span>
                    <span className="font-mono text-emerald-500 font-bold">{formatINR(seedsTarget * 0.68 * 180000)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Simulator Summary Output */}
          <Card className="border-border/80 bg-gradient-to-r from-card via-card to-muted/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block">
                Total Projected Monthly Revenue Run-Rate
              </span>
              <div className="text-3xl font-extrabold text-foreground mt-1">
                {formatINR(calculatedSimulatedRevenue)} <span className="text-xs text-muted-foreground font-normal">/ month</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground font-mono">Annualized Run-Rate (ARR)</span>
              <div className="text-xl font-bold text-primary">
                {formatINR(calculatedSimulatedRevenue * 12)}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: Viral Referral Links */}
        <TabsContent value="referrals" className="space-y-4">
          <Card className="border-border/70">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Client Referral Links &amp; Partner Graph</CardTitle>
                  <CardDescription className="text-xs">
                    Embed referral links in invoice receipts and proposals to turn happy clients into your acquisition channel.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsLinkDialogOpen(true)} className="gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" /> New Referral Link
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="space-y-3">
                {(data?.links || []).map((link: any) => (
                  <div
                    key={link.id}
                    className="p-4 rounded-xl border border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{link.referrerName}</span>
                        <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-primary border border-border">
                          {link.referralCode}
                        </code>
                        <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                          {link.rewardValue}% Discount Reward
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Clicks: <strong className="text-foreground">{link.clicksCount}</strong></span>
                        <span>•</span>
                        <span>Conversions: <strong className="text-foreground">{link.conversionsCount}</strong></span>
                        <span>•</span>
                        <span>Total Revenue: <strong className="text-emerald-500">{formatINR(link.totalRevenueGenerated)}</strong></span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(link.referralCode)}
                      className="shrink-0 gap-1.5 text-xs"
                    >
                      {copiedCode === link.referralCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Invite Link
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Guardian Churn Radar */}
        <TabsContent value="churn" className="space-y-4">
          <Card className="border-border/70">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-rose-500">
                <ShieldAlert className="w-4 h-4" /> Guardian Churn Early Warning System
              </CardTitle>
              <CardDescription className="text-xs">
                Accounts showing drop-offs in communication or payment delays. Execute win-back playbooks before contracts expire.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              {(data?.churnRiskAccounts || []).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  🎉 0 accounts at critical churn risk. All client health scores are within safe thresholds!
                </div>
              ) : (
                (data?.churnRiskAccounts || []).map((acc: any) => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{acc.accountName}</span>
                        <Badge variant="destructive" className="text-[10px]">
                          Health: {acc.healthScore}/100
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          MRR at Risk: {formatINR(acc.mrrValue)}
                        </span>
                      </div>
                      <p className="text-xs text-rose-500 font-medium">
                        {acc.churnRiskFactor || "High inactivity score."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExecutePlaybook(acc.id, "winback_discount")}
                        disabled={loadingActionId === acc.id}
                        className="text-xs border-rose-500/40 hover:bg-rose-500/10 text-foreground"
                      >
                        15% Loyalty Retainer Offer
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleExecutePlaybook(acc.id, "csm_urgent_outreach")}
                        disabled={loadingActionId === acc.id}
                        className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        Assign Urgent CSM Call
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Referral Link Modal */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Create Client Referral Link</DialogTitle>
            <DialogDescription className="text-xs">
              Generate a unique invitation code for a client, partner, or affiliate.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReferralLink} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="refName" className="text-xs font-medium">Referrer / Client Name</Label>
              <Input
                id="refName"
                placeholder="e.g. Acme Global Logistics"
                value={newReferrerName}
                onChange={(e) => setNewReferrerName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Reward Type</Label>
                <Select
                  value={newRewardType}
                  onValueChange={(v: any) => setNewRewardType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount_percent">Discount Percentage (%)</SelectItem>
                    <SelectItem value="credit">Account Credit (₹)</SelectItem>
                    <SelectItem value="commission">Sales Commission (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rewardVal" className="text-xs font-medium">Reward Value</Label>
                <Input
                  id="rewardVal"
                  type="number"
                  placeholder="15"
                  value={newRewardValue}
                  onChange={(e) => setNewRewardValue(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingLink || !newReferrerName.trim()}>
                {isCreatingLink && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Generate Referral Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
