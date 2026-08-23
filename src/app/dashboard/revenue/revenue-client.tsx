"use client";

import React, { useState } from "react";
import { TrendingUp, Users, DollarSign, ArrowUpRight, ArrowDownRight, Activity, Percent, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RevenueClientProps {
  user: any;
}

const METRICS = [
  { label: "MRR (Monthly Recurring)", value: "₹24,50,000", change: "+12.4%", up: true, desc: "vs last month" },
  { label: "ARR Run Rate", value: "₹2.94 Cr", change: "+14.8%", up: true, desc: "annualized target" },
  { label: "LTV Average", value: "₹4,80,000", change: "+3.2%", up: true, desc: "per subscription account" },
  { label: "Churn Rate (Logo)", value: "1.8%", change: "-0.4%", up: false, desc: "30-day trailing" },
];

const CUSTOMERS = [
  { name: "TechNova Solutions", plan: "Enterprise ($2.5k/mo)", usage: "85%", health: "Good", risk: "Low", lastActive: "2 hrs ago" },
  { name: "Apex Global Corp", plan: "Growth ($1.2k/mo)", usage: "94%", health: "Good", risk: "Low", lastActive: "15 mins ago" },
  { name: "CloudStream Inc", plan: "Enterprise ($3.0k/mo)", usage: "32%", health: "Warning", risk: "High", lastActive: "5 days ago" },
  { name: "Delta Logistics", plan: "Growth ($1.0k/mo)", usage: "54%", health: "Neutral", risk: "Medium", lastActive: "1 day ago" },
];

export default function RevenueClient({ user }: RevenueClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> SaaS MRR Dashboard
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          SaaS Vertical — Analyze Monthly Recurring Revenue (MRR), Annual Run Rate (ARR), churn analytics, and tenant product health.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => (
          <Card key={m.label} className="border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{m.label}</CardTitle>
              <div className={`p-1 rounded text-[10px] font-bold flex items-center ${
                m.up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}>
                {m.up ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {m.change}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{m.value}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-2 border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Active Subscriptions & Account Health
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Monitor active SaaS accounts and automated churn risk flags based on product usage and last activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[10px] text-muted-foreground uppercase font-semibold">
                    <th className="py-2.5">Customer</th>
                    <th className="py-2.5">Subscription Plan</th>
                    <th className="py-2.5">Usage Index</th>
                    <th className="py-2.5">Churn Risk</th>
                    <th className="py-2.5">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {CUSTOMERS.map((c) => (
                    <tr key={c.name} className="hover:bg-muted/10">
                      <td className="py-3 font-semibold text-foreground">{c.name}</td>
                      <td className="py-3 text-muted-foreground">{c.plan}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: c.usage }} />
                          </div>
                          <span>{c.usage}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.risk === "High" ? "bg-destructive/10 text-destructive" :
                          c.risk === "Medium" ? "bg-ai/10 text-ai" :
                          "bg-success/10 text-success"
                        }`}>
                          {c.risk} Risk
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{c.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-ai" /> Churn Predictor AI
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Automated account scoring.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl border border-ai/20 bg-ai/5">
              <p className="text-xs font-semibold text-ai flex items-center gap-1">
                ⚠️ At Churn Risk: CloudStream Inc
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Usage index dropped by 45% in the last 14 days. No sessions recorded in 5 days. Recommendation: Trigger Customer Success outreach workflow.
              </p>
              <Button size="xs" className="mt-3 bg-ai hover:bg-ai/90 text-ai-foreground text-[10px]">
                Create CS Task
              </Button>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-muted/10">
              <p className="text-xs font-semibold text-foreground">
                🚀 Expansion Candidate: Apex Global
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Seat utilization is at 94%. Usage frequency is above average. Recommended: Propose upgrade to Premium plan.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
