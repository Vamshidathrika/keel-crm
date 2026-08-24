"use client";

import React, { useState } from "react";
import { PRICING_PLANS, PlanKey, PlanDefinition } from "@/lib/billing";
import { startPlanCheckout } from "@/app/actions/billing";
import { toast } from "sonner";
import {
  Check,
  Zap,
  ShieldCheck,
  Crown,
  Users,
  CreditCard,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Building,
  CheckCircle2,
} from "lucide-react";

interface BillingClientProps {
  initialBillingData: {
    subscription: any;
    plan: PlanDefinition;
    activeSeats: number;
    seatLimit: number;
    isActive: boolean;
  };
}

export default function BillingClient({ initialBillingData }: BillingClientProps) {
  const [isAnnual, setIsAnnual] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<PlanKey>(
    (initialBillingData.subscription?.plan as PlanKey) || "starter"
  );
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);

  const handleUpgrade = async (planKey: PlanKey) => {
    if (planKey === currentPlan) {
      toast.info(`You are currently on the ${PRICING_PLANS[planKey].name} plan.`);
      return;
    }

    setIsUpgrading(planKey);
    try {
      const result = await startPlanCheckout(planKey, isAnnual);
      if (result?.url) {
        toast.success(`Successfully switched to ${PRICING_PLANS[planKey].name}!`);
        setCurrentPlan(planKey);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate plan upgrade.");
    } finally {
      setIsUpgrading(null);
    }
  };

  const activePlanDef = PRICING_PLANS[currentPlan] || PRICING_PLANS.starter;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">SaaS Subscription & Billing</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {(initialBillingData?.subscription?.status || "active").toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your workspace subscription tier, team seat quotas, and payment methods.
          </p>
        </div>

        {/* Annual / Monthly Toggle */}
        <div className="flex items-center gap-3 bg-muted/60 p-1.5 rounded-xl border border-border self-start md:self-auto">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              !isAnnual
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              isAnnual
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Annual</span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500 text-white leading-none">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Current Plan & Quota Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Tier */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Tier
            </span>
            <Crown className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold">{activePlanDef.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              ₹{isAnnual ? (activePlanDef.priceAnnualINR / 12).toFixed(0) : activePlanDef.priceMonthlyINR.toLocaleString()} / month
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Billing Cycle</span>
            <span className="font-semibold text-foreground">{isAnnual ? "Annual (Billed Yearly)" : "Monthly"}</span>
          </div>
        </div>

        {/* Seat Utilization */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Team Seats
            </span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{initialBillingData.activeSeats}</span>
              <span className="text-sm text-muted-foreground">/ {activePlanDef.seatsIncluded} seats used</span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (initialBillingData.activeSeats / activePlanDef.seatsIncluded) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Available Seats</span>
            <span className="font-semibold text-foreground">
              {Math.max(0, activePlanDef.seatsIncluded - initialBillingData.activeSeats)} seats
            </span>
          </div>
        </div>

        {/* Autonomous AI Agents Status */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              AI Agent Fleet
            </span>
            <Sparkles className="w-5 h-5 text-purple-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold">
              {activePlanDef.limits.agentFleetActive ? "4 Agents Active" : "Disabled (Starter)"}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activePlanDef.limits.agentFleetActive
                ? "Prospector, Deal Doctor, Guardian & Copilot"
                : "Upgrade to Growth to unlock autonomous fleet"}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Sweeps Execution</span>
            <span className="font-semibold text-foreground">
              {activePlanDef.limits.agentFleetActive ? "Unlimited 24h Sweeps" : "Manual Only"}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Selection Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">Choose the Right Plan for Your Fleet</h2>
          <p className="text-sm text-muted-foreground">
            All plans include SSL encryption, LibSQL multi-tenant isolation, and daily backups.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-2">
          {(Object.keys(PRICING_PLANS) as PlanKey[]).map((planKey) => {
            const plan = PRICING_PLANS[planKey];
            const isCurrent = planKey === currentPlan;
            const price = isAnnual ? plan.priceAnnualINR : plan.priceMonthlyINR;
            const monthlyEquivalent = isAnnual ? (plan.priceAnnualINR / 12).toFixed(0) : plan.priceMonthlyINR;

            return (
              <div
                key={planKey}
                className={`relative flex flex-col justify-between p-8 rounded-3xl border transition-all ${
                  plan.badge
                    ? "border-primary/50 bg-card shadow-lg ring-1 ring-primary/20"
                    : "border-border bg-card/60 shadow-xs"
                } ${isCurrent ? "ring-2 ring-emerald-500/50" : ""}`}
              >
                {plan.badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold bg-primary text-primary-foreground tracking-wide uppercase shadow-sm">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Current
                      </span>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">₹{Number(monthlyEquivalent).toLocaleString()}</span>
                    <span className="text-sm font-medium text-muted-foreground">/ month</span>
                  </div>
                  {isAnnual && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed annually (₹{price.toLocaleString()}/year)
                    </p>
                  )}

                  {/* Feature List */}
                  <ul className="mt-8 space-y-3.5 text-sm text-muted-foreground">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-foreground/90 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Upgrade Button */}
                <div className="mt-8 pt-6 border-t border-border">
                  <button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={isUpgrading !== null}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      isCurrent
                        ? "bg-muted text-muted-foreground cursor-default"
                        : plan.badge
                        ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {isUpgrading === planKey ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Upgrading...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      <>
                        Switch to {plan.name}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Payment Assurance */}
      <div className="p-6 rounded-2xl border border-border bg-muted/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Enterprise Data Guarantee</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              All plans include isolated organization partitions, GDPR data export rights, and SHA-256 encrypted API keys.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Processed securely via Stripe & UPI</span>
        </div>
      </div>
    </div>
  );
}
