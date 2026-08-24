"use client";

import React, { useState } from "react";
import {
  Target,
  Trophy,
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  Users,
  Award,
  BarChart3,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { setRepQuota, getQuotaDashboard } from "@/app/actions/quotas";
import { toast } from "sonner";

interface QuotasClientProps {
  user: any;
  initialData: any;
}

export default function QuotasClient({ user, initialData }: QuotasClientProps) {
  const [data, setData] = useState<any>(initialData || {});
  const [isQuotaDialogOpen, setIsQuotaDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Set Quota Form State
  const [selectedUserId, setSelectedUserId] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("1000000");
  const [commissionRate, setCommissionRate] = useState("8");
  const [bonusThreshold, setBonusThreshold] = useState("1200000");
  const [bonusRate, setBonusRate] = useState("12");

  const formatINR = (val: number) => `₹${(val || 0).toLocaleString("en-IN")}`;

  const handleSaveQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("Please select a sales representative.");
      return;
    }

    setIsSaving(true);
    try {
      await setRepQuota({
        userId: selectedUserId,
        period: data.period || "2026-Q3",
        targetRevenue: parseFloat(targetRevenue) || 1000000,
        commissionRatePercent: parseFloat(commissionRate) || 8,
        bonusThreshold: parseFloat(bonusThreshold) || 1200000,
        bonusRatePercent: parseFloat(bonusRate) || 12,
      });

      toast.success("Sales quota updated successfully!");
      const refreshed = await getQuotaDashboard(data.period || "2026-Q3");
      setData(refreshed);
      setIsQuotaDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update quota.");
    } finally {
      setIsSaving(false);
    }
  };

  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              <Target className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Sales Quotas & Commission Leaderboard
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
              {data?.period || "2026-Q3"} Target
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Rep revenue targets, live attainment percentages, pipeline coverage ratios, and automated tiered commission calculations.
          </p>
        </div>

        {isManagerOrAdmin && (
          <Button size="sm" onClick={() => setIsQuotaDialogOpen(true)} className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Set Rep Quota
          </Button>
        )}
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Team Quota Target</span>
              <Target className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{formatINR(data?.totalOrgTarget || 0)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Total org revenue commitment</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Closed Revenue (Won)</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-500">{formatINR(data?.totalOrgActual || 0)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Attainment: <strong className="text-foreground">{data?.orgAttainment || 0}%</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Open Pipeline Value</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-500">{formatINR(data?.totalOrgPipeline || 0)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Deals in open pipeline stages</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Commission Pool</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-500">
              {formatINR(
                (data?.reps || []).reduce((sum: number, r: any) => sum + (r.commissionEarned || 0), 0)
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Accrued rep commission payouts</p>
          </CardContent>
        </Card>
      </div>

      {/* Reps Leaderboard Table */}
      <Card className="border-border/70">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Rep Quota Attainment & Leaderboard
          </CardTitle>
          <CardDescription className="text-xs">
            Individual sales rep targets, closed revenue, win count, and commission tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {(data?.reps || []).length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No sales team members found. Invite team members in Settings.
            </div>
          ) : (
            <div className="space-y-3">
              {(data?.reps || []).map((rep: any, idx: number) => {
                const isLeader = idx === 0 && rep.actualRevenue > 0;
                return (
                  <div
                    key={rep.userId}
                    className="p-4 rounded-xl border border-border/80 bg-card flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-sm text-foreground">{rep.name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {rep.role}
                        </Badge>
                        {isLeader && (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] gap-1">
                            <Award className="w-3 h-3" /> Top Closer
                          </Badge>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1 max-w-md">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground font-mono">
                            {formatINR(rep.actualRevenue)} / {formatINR(rep.targetRevenue)}
                          </span>
                          <span className="font-bold text-foreground font-mono">{rep.attainmentPercent}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rep.attainmentPercent >= 100
                                ? "bg-emerald-500"
                                : rep.attainmentPercent >= 50
                                ? "bg-primary"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(rep.attainmentPercent, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                        <span>Pipeline Coverage: <strong className="text-foreground">{rep.pipelineCoverage}x</strong></span>
                        <span>•</span>
                        <span>Deals Won: <strong className="text-foreground">{rep.dealsWonCount}</strong></span>
                        <span>•</span>
                        <span>Base Rate: <strong className="text-foreground">{rep.commissionRate}%</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono uppercase block">
                        Accrued Commission
                      </span>
                      <span className="text-lg font-bold font-mono text-emerald-500">
                        {formatINR(rep.commissionEarned)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Set Quota Dialog */}
      <Dialog open={isQuotaDialogOpen} onOpenChange={setIsQuotaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Assign Sales Quota & Commission</DialogTitle>
            <DialogDescription className="text-xs">
              Set revenue targets and commission acceleration tiers for sales reps.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuota} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sales Representative</Label>
              <Select value={selectedUserId} onValueChange={(val: any) => setSelectedUserId(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.reps || []).map((r: any) => (
                    <SelectItem key={r.userId} value={r.userId}>
                      {r.name} ({r.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="targetRev" className="text-xs font-medium">Target Revenue (₹)</Label>
                <Input
                  id="targetRev"
                  type="number"
                  placeholder="1000000"
                  value={targetRevenue}
                  onChange={(e) => setTargetRevenue(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="commRate" className="text-xs font-medium">Base Commission (%)</Label>
                <Input
                  id="commRate"
                  type="number"
                  placeholder="8"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bonusThresh" className="text-xs font-medium">Accelerator Tier (₹)</Label>
                <Input
                  id="bonusThresh"
                  type="number"
                  placeholder="1200000"
                  value={bonusThreshold}
                  onChange={(e) => setBonusThreshold(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bonusRt" className="text-xs font-medium">Bonus Rate (%)</Label>
                <Input
                  id="bonusRt"
                  type="number"
                  placeholder="12"
                  value={bonusRate}
                  onChange={(e) => setBonusRate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsQuotaDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving || !selectedUserId}>
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Save Quota Target
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
