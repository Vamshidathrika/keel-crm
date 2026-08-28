"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerConfetti } from "./confetti-celebration";
import Link from "next/link";

interface QuestStep {
  id: string;
  label: string;
  description: string;
  href?: string;
  isAction?: boolean;
}

interface ActivationQuestCardProps {
  businessType?: string | null;
  orgName?: string;
}

export default function ActivationQuestCard({
  businessType = "Logistics",
  orgName = "Keel Workspace",
}: ActivationQuestCardProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Initialize from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("keel_activation_quests");
      if (saved) {
        setCompletedSteps(JSON.parse(saved));
      }
      const savedDismissed = localStorage.getItem("keel_quest_dismissed");
      if (savedDismissed === "true") {
        setIsDismissed(true);
      }
    } catch (_e) {}
  }, []);

  // Save changes to localStorage
  const updateCompletedStep = (id: string, isDone: boolean, triggerCelebration: boolean = false) => {
    setCompletedSteps((prev) => {
      const updated = { ...prev, [id]: isDone };
      try {
        localStorage.setItem("keel_activation_quests", JSON.stringify(updated));
      } catch (_e) {}
      return updated;
    });

    if (isDone && triggerCelebration) {
      setTimeout(() => {
        triggerConfetti();
      }, 50);
    }
  };

  // Auto-detect page visits for steps without firing disruptive confetti in effect
  useEffect(() => {
    if (pathname.includes("/dashboard/deals") && !completedSteps.pipeline) {
      updateCompletedStep("pipeline", true, false);
    }
    if (pathname.includes("/dashboard/agent-hub") && !completedSteps.ai_score) {
      updateCompletedStep("ai_score", true, false);
    }
  }, [pathname]);

  const steps: QuestStep[] = [
    {
      id: "pipeline",
      label: `Inspect ${businessType || "Sales"} Pipeline`,
      description: "Review stage probabilities & drag cards",
      href: "/dashboard/deals",
    },
    {
      id: "deal_progress",
      label: "Advance a deal to Won",
      description: "Drag a proposal card or create a new deal",
      href: "/dashboard/deals",
    },
    {
      id: "ai_score",
      label: "Test Keel AI Autonomous Agents",
      description: "Review predictive lead scoring factors",
      href: "/dashboard/agent-hub",
    },
    {
      id: "invite_team",
      label: "Invite first team member",
      description: "1-click shareable workspace link",
      isAction: true,
    },
  ];

  const completedCount = steps.filter((s) => completedSteps[s.id]).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const handleCopyInvite = () => {
    const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/register` : "";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
    }
    setCopiedInvite(true);
    updateCompletedStep("invite_team", true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("keel_quest_dismissed", "true");
    } catch (_e) {}
  };

  if (isDismissed) return null;

  // Minimized Pill
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border border-primary/30 bg-card/90 px-4 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md hover:border-primary hover:bg-primary/5 transition-all group"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
            <Zap className="h-3 w-3" />
          </span>
          <span>Launch Quest</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            {completedCount}/{steps.length}
          </span>
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-84 sm:w-96 rounded-2xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur-xl transition-all animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Workspace Setup Quest
            </h4>
            <p className="text-[10px] text-muted-foreground">{orgName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Minimize"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1.5">
          <span>{progressPercent === 100 ? "🎉 Setup Complete!" : "Activation Progress"}</span>
          <span className="text-primary font-bold">{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quest Steps */}
      <div className="space-y-2">
        {steps.map((step) => {
          const isDone = !!completedSteps[step.id];
          return (
            <div
              key={step.id}
              className={`group flex items-start justify-between rounded-xl border p-2.5 transition-all ${
                isDone
                  ? "border-primary/20 bg-primary/5 text-muted-foreground"
                  : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => updateCompletedStep(step.id, !isDone, !isDone)}
                  className="mt-0.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-primary fill-primary/20" />
                  ) : (
                    <Circle className="h-4 w-4 group-hover:text-primary" />
                  )}
                </button>
                <div>
                  <p
                    className={`text-xs font-semibold leading-none ${
                      isDone ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>

              {step.isAction ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyInvite}
                  className="h-6 text-[10px] px-2 gap-1 ml-2 font-medium"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="h-3 w-3 text-green-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy Link
                    </>
                  )}
                </Button>
              ) : step.href ? (
                <Link href={step.href}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      {progressPercent === 100 && (
        <div className="mt-3.5 rounded-xl border border-green-500/20 bg-green-500/10 p-2.5 text-center text-xs font-semibold text-green-600 dark:text-green-400">
          ✨ You&apos;ve unlocked full autonomous CRM power!
        </div>
      )}
    </div>
  );
}
