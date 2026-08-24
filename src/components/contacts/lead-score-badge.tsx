"use client";

import React from "react";
import { Flame, Sparkles, Snowflake } from "lucide-react";

interface LeadScoreBadgeProps {
  score?: number | null;
  breakdown?: {
    band?: "hot" | "warm" | "cold";
    details?: string[];
  } | null;
}

export function LeadScoreBadge({ score = 0, breakdown }: LeadScoreBadgeProps) {
  const finalScore = score ?? 0;
  const band = breakdown?.band || (finalScore >= 75 ? "hot" : finalScore >= 45 ? "warm" : "cold");

  if (band === "hot") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
        <Flame className="w-3 h-3 fill-amber-500" />
        {finalScore} • HOT
      </span>
    );
  }

  if (band === "warm") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
        <Sparkles className="w-3 h-3" />
        {finalScore} • WARM
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border">
      <Snowflake className="w-3 h-3" />
      {finalScore} • COLD
    </span>
  );
}
