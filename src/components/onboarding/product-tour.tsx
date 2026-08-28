"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Search,
  LayoutGrid,
  Bot,
  Bell,
  Kanban,
  FileText,
  Users,
  ShieldCheck,
  Zap,
  TrendingUp,
  Award,
  Layers,
  ChevronRight,
  DollarSign,
  Workflow,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { triggerConfetti } from "./confetti-celebration";

export interface TourStep {
  target: string; // CSS data-tour selector
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  placement?: "bottom" | "top" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "search",
    title: "Global Command Bar & Omnisearch",
    badge: "Fast Navigation",
    description:
      "Press ⌘K anywhere to search opportunities, executive contacts, corporate accounts, or trigger instantaneous system actions.",
    icon: <Search className="w-4 h-4 text-primary" />,
    placement: "bottom",
  },
  {
    target: "sidebar",
    title: "Institutional Workspace & Navigation",
    badge: "RevOps Navigation",
    description:
      "Access Deals, Corporate Accounts, Stakeholder Rosters, Sales Cadences, Quotas, and Keel LedgerOS™ from a structured control bar.",
    icon: <LayoutGrid className="w-4 h-4 text-primary" />,
    placement: "right",
  },
  {
    target: "workspace",
    title: "Opportunities & Revenue Command Center",
    badge: "Core Pipeline",
    description:
      "Monitor weighted revenue forecasts, deal velocity forensics, multi-stage pipelines, and automated morning briefing intelligence.",
    icon: <Kanban className="w-4 h-4 text-primary" />,
    placement: "bottom",
  },
  {
    target: "copilot",
    title: "Keel Autonomous AI Copilot & Agents",
    badge: "Autonomous RevOps",
    description:
      "Your 24/7 AI agent fleet: Prospector (enrichment), Deal Doctor (risk mitigation), and Account Guardian (retention & telemetry).",
    icon: <Bot className="w-4 h-4 text-primary" />,
    placement: "left",
  },
  {
    target: "notifications",
    title: "Statutory Alerts & Signal Feed",
    badge: "Telemetry",
    description:
      "Real-time visibility over deal movements, automated manager approval triggers, dunning retries, and team workload updates.",
    icon: <Bell className="w-4 h-4 text-primary" />,
    placement: "bottom",
  },
];

const DEEP_FEATURE_MODULES = [
  {
    id: "pipeline",
    title: "Opportunities & Stage-Weighted Pipeline",
    badge: "Revenue Architecture",
    icon: Kanban,
    summary:
      "Multi-stage Kanban pipelines with mathematical win probabilities, real-time deal forensics, and discount approval guardrails.",
    keyCapabilities: [
      "Dynamic stage-weighted revenue realization and quarterly quota tracking",
      "Stale deal detection algorithms identifying dormant opportunities over 14 days",
      "Managerial discount approval workflows blocking unauthorised price cuts >20%",
      "Structured Lost Reason telemetry & competitor battlecard integration",
    ],
    technicalHighlights: "Built on Drizzle ORM with compound tenant isolation, stage probability indexes, and sub-10ms query times.",
  },
  {
    id: "contacts",
    title: "Key Stakeholders & Contact Intelligence",
    badge: "Customer 360",
    icon: Users,
    summary:
      "Unified contact and corporate account directory powered by predictive ICP lead scoring and automated transcript analysis.",
    keyCapabilities: [
      "Algorithmic lead scoring (0–100) dynamically ranking high-intent executive buyers",
      "AI call transcript ingestion with automatic action item extraction and follow-up email drafts",
      "360-degree chronological timeline aggregating quotes, invoices, emails, and meetings",
      "Zero-latency CSV bulk roster import with client-side header mapping and validation",
    ],
    technicalHighlights: "Unified activity ledger across tables with automated vector embeddings and full multi-tenant scoping.",
  },
  {
    id: "ledger",
    title: "Keel LedgerOS™ & Sovereign Fiscal Engine",
    badge: "Statutory Billing",
    icon: FileText,
    summary:
      "Enterprise billing and accounts payable studio supporting Indian GST compliance, Place of Supply routing, TDS withholding, and dunning.",
    keyCapabilities: [
      "Automated Intra-State (CGST 9% + SGST 9%) vs Inter-State (IGST 18%) tax determination",
      "Statutory TDS deductions (Section 194J tech services, Section 194C contractor contracts)",
      "Dynamic NPCI UPI QR code generation for instant invoice settlements",
      "Multi-model monetization (Flat, Tiered, Metered Usage) with autonomous smart dunning retries",
    ],
    technicalHighlights: "Full double-entry invoice schema with JSON multi-line items, audit trails, and automated receipt generation.",
  },
  {
    id: "agents",
    title: "Autonomous AI Agent Fleet & Control Hub",
    badge: "AI RevOps",
    icon: Bot,
    summary:
      "Autonomous background agents executing pipeline diagnosis, waterfall contact enrichment, and churn mitigation playbooks.",
    keyCapabilities: [
      "Prospector Agent: Waterfall domain research and executive email discovery",
      "Deal Doctor: Continuous velocity monitoring and automated objection battlecards",
      "Account Guardian: Ingestion of payment telemetry to predict and prevent enterprise churn",
      "Executive Briefing: Daily AI Morning Brief compiling pipeline movements and urgent actions",
    ],
    technicalHighlights: "Operates with Human-In-The-Loop (Supervised) and Full-Auto execution queues protected by secret authorization tokens.",
  },
  {
    id: "workload",
    title: "Sales Force & Workload Allocation Engine",
    badge: "Capacity Governance",
    icon: ShieldCheck,
    summary:
      "Real-time bandwidth governance, autonomous round-robin lead distribution, and tokenized mobile-responsive Rep Work Portals.",
    keyCapabilities: [
      "Real-time bandwidth load calculations (Low, Optimal, High, Overloaded)",
      "1-Click autonomous round-robin distribution balancing unassigned deals and tasks",
      "Tokenized Rep Work Portals allowing sales reps to manage assigned pipeline from mobile without credentials",
      "Bulk queue reassignment for seamless coverage during team transitions or leaves",
    ],
    technicalHighlights: "Real-time capacity tracking with granular role-based security and dedicated rep portal subroutes.",
  },
  {
    id: "workflows",
    title: "Visual DAG Automation & Dynamic Schemas",
    badge: "Extensibility",
    icon: Workflow,
    summary:
      "No-code custom business entity builder and visual DAG automation engine executing multi-step trigger-condition-action workflows.",
    keyCapabilities: [
      "Custom Business Entity modeling (Properties, Shipments, KYC) with dynamic schemas without migrations",
      "Visual Directed Acyclic Graph (DAG) canvas for configuring multi-branch automations",
      "Automated task creation, webhook dispatch, and notification routing on deal stage transitions",
      "Custom field engine supporting text, numbers, dates, dropdowns, and boolean flags",
    ],
    technicalHighlights: "Runtime Zod schema compiler validating dynamic inputs and DAG execution engine with recursive dependency resolution.",
  },
];

export function startProductTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("keel-start-tour"));
  }
}

export default function ProductTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isOverviewComplete, setIsOverviewComplete] = useState(false);
  const [isDeepTourOpen, setIsDeepTourOpen] = useState(false);
  const [selectedDeepTab, setSelectedDeepTab] = useState("pipeline");
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const stepRef = useRef(currentStepIndex);
  stepRef.current = currentStepIndex;

  // Auto-launch for fresh users if not yet completed
  useEffect(() => {
    try {
      const completed = localStorage.getItem("keel_tour_completed");
      if (!completed || completed !== "true") {
        // Automatically start tour on fresh load
        const timer = setTimeout(() => {
          setIsActive(true);
          setCurrentStepIndex(0);
          setIsOverviewComplete(false);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (_e) {}
  }, []);

  // Listen for custom trigger
  useEffect(() => {
    const handleStart = () => {
      setCurrentStepIndex(0);
      setIsOverviewComplete(false);
      setIsDeepTourOpen(false);
      setIsActive(true);
    };

    window.addEventListener("keel-start-tour", handleStart);
    return () => window.removeEventListener("keel-start-tour", handleStart);
  }, []);

  // Update spotlight position
  const updateSpotlight = useCallback(() => {
    if (!isActive || isOverviewComplete || isDeepTourOpen) return;
    if (!currentStep) return;

    const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setTargetRect({
        top: window.innerHeight / 2 - 50,
        left: window.innerWidth / 2 - 150,
        width: 300,
        height: 100,
      });
    }
  }, [isActive, isOverviewComplete, isDeepTourOpen, currentStep]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [updateSpotlight]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive || isDeepTourOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (!isOverviewComplete) {
          if (stepRef.current < TOUR_STEPS.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
          } else {
            setIsOverviewComplete(true);
          }
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isOverviewComplete) {
          setIsOverviewComplete(false);
        } else if (stepRef.current > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isOverviewComplete, isDeepTourOpen]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsOverviewComplete(true);
    }
  };

  const handleBack = () => {
    if (isOverviewComplete) {
      setIsOverviewComplete(false);
    } else if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleLaunchDeepTour = () => {
    setIsOverviewComplete(false);
    setIsActive(false);
    setIsDeepTourOpen(true);
  };

  const handleCompleteAndDismiss = () => {
    setIsActive(false);
    setIsOverviewComplete(false);
    setIsDeepTourOpen(false);
    triggerConfetti();

    try {
      localStorage.setItem("keel_tour_completed", "true");
      window.dispatchEvent(
        new CustomEvent("keel-tour-status-change", {
          detail: { completed: true },
        })
      );
    } catch (_e) {}
  };

  const handleDismiss = () => {
    setIsActive(false);
    setIsOverviewComplete(false);
    setIsDeepTourOpen(false);

    try {
      localStorage.setItem("keel_tour_completed", "true");
      window.dispatchEvent(
        new CustomEvent("keel-tour-status-change", {
          detail: { completed: true },
        })
      );
    } catch (_e) {}
  };

  // 1. Render In-Depth Feature Architecture Studio Modal (Deep Dive)
  if (isDeepTourOpen) {
    const currentModule = DEEP_FEATURE_MODULES.find((m) => m.id === selectedDeepTab) || DEEP_FEATURE_MODULES[0];
    const currentIndex = DEEP_FEATURE_MODULES.findIndex((m) => m.id === selectedDeepTab);
    const ModuleIcon = currentModule.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
        <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col border border-border shadow-2xl bg-card overflow-hidden">
          {/* Header */}
          <CardHeader className="p-6 border-b border-border bg-gradient-to-r from-card via-card to-primary/5 flex flex-row items-center justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <BookOpen className="w-5 h-5" />
                </span>
                <CardTitle className="text-lg font-bold text-foreground">
                  Keel Platform Architecture &amp; In-Depth Feature Tour
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                  Deep Dive
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Exhaustive operational blueprints, automated AI hooks, compliance logic, and RevOps telemetry across all modules.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCompleteAndDismiss}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Tabs List */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
              {DEEP_FEATURE_MODULES.map((mod) => {
                const Icon = mod.icon;
                const isSelected = mod.id === selectedDeepTab;
                return (
                  <button
                    key={mod.id}
                    onClick={() => setSelectedDeepTab(mod.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{mod.title.split("&")[0].trim()}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Module Card */}
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <ModuleIcon className="w-5 h-5 text-primary" />
                      {currentModule.title}
                    </h3>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {currentModule.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{currentModule.summary}</p>
                </div>
              </div>

              {/* Capabilities Grid */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Key Operational &amp; Business Capabilities
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentModule.keyCapabilities.map((cap, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border/80 bg-muted/20 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed text-foreground font-medium">{cap}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Architecture Note */}
              <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-foreground font-mono">
                    <strong>Architecture:</strong> {currentModule.technicalHighlights}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentIndex > 0) {
                    setSelectedDeepTab(DEEP_FEATURE_MODULES[currentIndex - 1].id);
                  }
                }}
                disabled={currentIndex === 0}
                className="text-xs gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous Module
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentIndex < DEEP_FEATURE_MODULES.length - 1) {
                    setSelectedDeepTab(DEEP_FEATURE_MODULES[currentIndex + 1].id);
                  }
                }}
                disabled={currentIndex === DEEP_FEATURE_MODULES.length - 1}
                className="text-xs gap-1"
              >
                Next Module <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button
              size="sm"
              onClick={handleCompleteAndDismiss}
              className="text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md font-semibold"
            >
              <Check className="w-4 h-4" /> Finish Deep Tour &amp; Launch Workspace
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 2. Render Overview Completion Card (Option to Deep Dive or Finish)
  if (isActive && isOverviewComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
        <Card className="w-full max-w-lg border border-border shadow-2xl bg-card overflow-hidden">
          <CardHeader className="p-6 border-b border-border bg-gradient-to-br from-card via-card to-primary/10">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Award className="w-6 h-6" />
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCompleteAndDismiss}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardTitle className="text-xl font-bold text-foreground mt-3">
              Platform Overview Complete! 🎉
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              You have reviewed the core pillars of Keel CRM. Your workspace is 100% clean and ready for institutional operations.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Sparkles className="w-4 h-4" /> Want to know in detail about each feature?
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Take an exhaustive, interactive architectural tour covering GST statutory formulas, predictive lead algorithms, autonomous AI workflows, and rep portal execution.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                onClick={handleLaunchDeepTour}
                className="w-full justify-center gap-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md py-5"
              >
                <BookOpen className="w-4 h-4" />
                Deep Dive: Explore All Features in Detail
              </Button>

              <Button
                variant="outline"
                onClick={handleCompleteAndDismiss}
                className="w-full justify-center gap-2 text-xs font-semibold py-4 border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Check className="w-4 h-4" />
                Launch Clean Workspace &amp; Dismiss Tour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Render Step-by-Step Spotlight Tour
  if (!isActive || !targetRect || !currentStep) return null;

  const padding = 8;
  const spotlightX = Math.max(0, targetRect.left - padding);
  const spotlightY = Math.max(0, targetRect.top - padding);
  const spotlightW = targetRect.width + padding * 2;
  const spotlightH = targetRect.height + padding * 2;

  // Tooltip positioning
  let tooltipTop = spotlightY + spotlightH + 16;
  let tooltipLeft = spotlightX;

  if (tooltipTop + 240 > window.innerHeight) {
    tooltipTop = Math.max(16, spotlightY - 250);
  }
  if (tooltipLeft + 360 > window.innerWidth) {
    tooltipLeft = Math.max(16, window.innerWidth - 380);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* SVG Spotlight Cutout Backdrop */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="keel-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={spotlightX}
              y={spotlightY}
              width={spotlightW}
              height={spotlightH}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.72)"
          mask="url(#keel-tour-mask)"
        />
      </svg>

      {/* Pulsing Spotlight Border */}
      <div
        className="fixed rounded-lg border-2 border-primary/80 shadow-[0_0_24px_rgba(59,130,246,0.35)] pointer-events-none transition-all duration-300 animate-pulse"
        style={{
          top: spotlightY,
          left: spotlightX,
          width: spotlightW,
          height: spotlightH,
        }}
      />

      {/* Floating Tour Tooltip Card */}
      <div
        className="fixed z-50 w-[350px] rounded-xl border border-border bg-card shadow-2xl p-4 transition-all duration-300 backdrop-blur-md animate-in fade-in zoom-in-95"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/80">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-primary/10 text-primary border border-primary/20">
              {currentStep.icon}
            </span>
            <span className="text-xs font-bold text-foreground truncate max-w-[170px]">
              {currentStep.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] font-mono uppercase bg-primary/5 text-primary border-primary/30">
              {currentStep.badge}
            </Badge>
            <button
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Close Tour"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <p className="text-xs text-muted-foreground leading-relaxed my-3">
          {currentStep.description}
        </p>

        {/* Progress & Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-border/80">
          {/* Step indicator dots */}
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? "w-4 bg-primary"
                    : idx < currentStepIndex
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted"
                }`}
              />
            ))}
            <span className="text-[10px] font-mono text-muted-foreground ml-1">
              {currentStepIndex + 1}/{TOUR_STEPS.length}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {currentStepIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleNext}
              className="h-7 px-3 text-xs gap-1 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? (
                <>
                  <span>Overview Done</span>
                  <Check className="w-3 h-3" />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
