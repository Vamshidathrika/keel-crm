"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Clock, Terminal, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface AgentRunLogProps {
  runs: any[];
}

export function AgentRunLog({ runs }: AgentRunLogProps) {
  if (!runs || runs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm border rounded-lg">
        No autonomous agent execution logs recorded yet. Run an audit sweep to view traces.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const thoughtProcess = Array.isArray(run.thoughtProcess) ? run.thoughtProcess : [];
        const isSuccess = run.status === "completed" || run.status === "requires_approval";

        return (
          <Card key={run.id} className="text-xs hover:border-primary/30 transition-colors">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2.5">
                {isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
                <div>
                  <span className="font-semibold text-foreground capitalize">
                    {run.agentType.replace("_", " ")}
                  </span>
                  <span className="text-muted-foreground font-mono ml-2 text-[10px]">
                    {run.id}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                {run.confidenceScore !== null && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-foreground">
                    {Math.round(run.confidenceScore * 100)}% Conf
                  </span>
                )}
                <span className="text-[10px]">
                  {new Date(run.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-3 space-y-2">
              <p className="text-foreground leading-relaxed">{run.summary}</p>

              {/* Thought Steps */}
              {thoughtProcess.length > 0 && (
                <div className="bg-muted/30 p-2.5 rounded border text-[11px] font-mono space-y-1 text-muted-foreground">
                  <div className="font-semibold text-[10px] uppercase text-foreground/80">
                    Reasoning Trace:
                  </div>
                  {thoughtProcess.map((step: string, sIdx: number) => (
                    <div key={sIdx} className="flex items-start gap-1.5">
                      <span className="text-primary font-bold">{sIdx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
