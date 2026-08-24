"use client";

import React, { useState } from "react";
import { TrendingUp, Users, DollarSign, ArrowUpRight, ArrowDownRight, Activity, Percent, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface RevenueClientProps {
  user: any;
  initialData: {
    metrics: Array<{ label: string; value: string; change: string; up: boolean; desc: string }>;
    customers: Array<{ name: string; plan: string; usage: string; health: string; risk: string; lastActive: string }>;
  };
}

export default function RevenueClient({ user, initialData }: RevenueClientProps) {
  const metrics = initialData?.metrics || [];
  const customers = initialData?.customers || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> SaaS MRR & Revenue Dashboard
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Live Database Metrics — Monthly Recurring Revenue (MRR), Annual Run Rate (ARR), LTV, and customer retention.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{m.label}</CardTitle>
              <div className={`p-1 rounded text-[10px] font-bold flex items-center ${
                m.up ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
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
            <CardTitle className="text-sm font-semibold">Active Customer Accounts & Health</CardTitle>
            <CardDescription className="text-xs">
              Live subscription accounts provisioned in SQLite database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No paying customer accounts provisioned yet. Convert deals in Business OS to track live MRR.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Plan / Contract</th>
                      <th className="p-3">Health</th>
                      <th className="p-3">Risk Tier</th>
                      <th className="p-3 text-right">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customers.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-semibold text-foreground">{c.name}</td>
                        <td className="p-3 text-muted-foreground">{c.plan}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            c.health === "Healthy" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                          }`}>
                            {c.health}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{c.risk}</td>
                        <td className="p-3 text-right text-muted-foreground">{c.lastActive}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Revenue Sentinel</CardTitle>
            <CardDescription className="text-xs">
              Continuous multi-agent audit status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b">
              <span className="text-muted-foreground">Prospector Scoring</span>
              <span className="font-semibold text-emerald-500">Active</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b">
              <span className="text-muted-foreground">Deal Doctor Sentinel</span>
              <span className="font-semibold text-emerald-500">Active</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b">
              <span className="text-muted-foreground">Payment Inbound Webhook</span>
              <span className="font-semibold text-emerald-500">Listening</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-muted-foreground">Database Engine</span>
              <span className="font-mono text-[10px] text-foreground">SQLite / Drizzle</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
