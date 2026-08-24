"use client";

import React from "react";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DealHealthIndicatorProps {
  healthScore?: number | null;
  riskFlags?: string[];
  daysInStage?: number;
}

export function DealHealthIndicator({
  healthScore = 80,
  riskFlags = [],
  daysInStage = 0,
}: DealHealthIndicatorProps) {
  const score = healthScore ?? 80;
  const isHighRisk = score < 50 || riskFlags.length > 0;
  const isModerateRisk = score >= 50 && score < 75;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          <Activity className="w-3 h-3 text-primary" />
          Deal Health:
        </span>
        <span
          className={`font-semibold ${
            isHighRisk
              ? "text-destructive"
              : isModerateRisk
              ? "text-amber-500"
              : "text-emerald-500"
          }`}
        >
          {score}/100
        </span>
      </div>

      {riskFlags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {riskFlags.map((flag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-destructive/10 text-destructive border border-destructive/20"
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
