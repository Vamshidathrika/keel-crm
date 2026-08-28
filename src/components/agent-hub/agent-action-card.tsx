"use client";

import React from "react";
import { Check, X, AlertTriangle, Shield, Clock, Layers, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AgentActionCardProps {
  action: any;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  processingId?: string | null;
}

export function AgentActionCard({
  action,
  onApprove,
  onReject,
  processingId,
}: AgentActionCardProps) {
  const isProcessing = processingId === action.id;
  const payload = action.actionPayload || {};
  const riskTier = payload.riskTier || "medium";

  const severityColor =
    action.severity === "critical"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : action.severity === "warning"
      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
      : "bg-blue-500/10 text-blue-500 border-blue-500/20";

  return (
    <Card className="hover:shadow-md transition-all border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${severityColor}`}
            >
              {action.severity?.toUpperCase() || "INFO"}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Risk: {riskTier.toUpperCase()}
            </span>
          </div>
          <span suppressHydrationWarning className="text-[10px] text-muted-foreground">
            {new Date(action.createdAt).toLocaleDateString()}
          </span>
        </div>
        <CardTitle className="text-sm font-semibold pt-1 text-foreground">
          {action.title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {action.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Before / Proposed State Diff */}
        {(payload.beforeState || payload.proposedState) && (
          <div className="bg-muted/40 p-2 rounded-md border text-[11px] space-y-1">
            <div className="font-semibold text-muted-foreground">Proposed Mutation:</div>
            {payload.beforeState && (
              <div className="text-destructive line-through">
                Current: {JSON.stringify(payload.beforeState)}
              </div>
            )}
            {payload.proposedState && (
              <div className="text-emerald-500 font-medium">
                Target: {JSON.stringify(payload.proposedState)}
              </div>
            )}
          </div>
        )}

        {/* Provenance Citation */}
        {payload.provenance && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
            <Shield className="w-3 h-3 text-primary" />
            Verified Source: {payload.provenance.source || "Agent Reasoning"}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            disabled={isProcessing}
            onClick={() => onReject(action.id)}
            className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </Button>
          <Button
            size="sm"
            disabled={isProcessing}
            onClick={() => onApprove(action.id)}
            className="h-8 text-xs gap-1"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            1-Click Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
