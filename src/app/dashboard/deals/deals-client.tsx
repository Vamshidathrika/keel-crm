"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Plus,
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  X,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  Building2,
  User,
  PlusCircle,
  ShieldAlert,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDeal, updateDeal, deleteDeal, getDeals } from "@/app/actions/deals";
import { createActivity } from "@/app/actions/activities";
import ActivityTimeline from "@/components/activity-timeline";
import { toast } from "sonner";

type Deal = {
  id: string;
  title: string;
  value: number;
  currency: string;
  pipelineId: string;
  stageId: string;
  contactId: string | null;
  companyId: string | null;
  ownerId: string | null;
  expectedCloseDate: string | null;
  probability: number;
  healthFlags: string[];
  source: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string | null;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  stage?: {
    id: string;
    name: string;
    type: string;
    color: string;
  } | null;
};

type Pipeline = {
  id: string;
  name: string;
  isDefault: boolean;
  stages: {
    id: string;
    name: string;
    order: number;
    type: "open" | "won" | "lost";
    probability: number;
    color: string;
  }[];
};

type Contact = {
  id: string;
  firstName: string;
  lastName: string | null;
};

type Company = {
  id: string;
  name: string;
};

interface DealsClientProps {
  initialDeals: Deal[];
  pipelines: Pipeline[];
  contacts: Contact[];
  companies: Company[];
  currentUser: any;
  businessType?: string;
}

export default function DealsClient({
  initialDeals,
  pipelines,
  contacts,
  companies,
  currentUser,
  businessType = "logistics",
}: DealsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(
    pipelines.find((p) => p.isDefault) || pipelines[0] || null
  );

  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [view, setView] = useState<"kanban" | "table" | "calendar">("kanban");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

  // Detail Sheet timeline refresh
  const [timelineRefresh, setTimelineRefresh] = useState(0);
  const [noteBody, setNoteBody] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  // Cargo logistics margin calculator states
  const [calcBuyRate, setCalcBuyRate] = useState<string>("");
  const [calcSellRate, setCalcSellRate] = useState<string>("");
  const [calcMode, setCalcMode] = useState<string>("ocean");

  // SaaS states
  const [calcSaaSRate, setCalcSaaSRate] = useState<string>("");
  const [calcSaaSSeats, setCalcSaaSSeats] = useState<string>("");
  const [calcSaaSMonths, setCalcSaaSMonths] = useState<string>("12");

  // Real Estate states
  const [calcPropPrice, setCalcPropPrice] = useState<string>("");
  const [calcCommPct, setCalcCommPct] = useState<string>("2");
  const [calcAgentSplit, setCalcAgentSplit] = useState<string>("70");

  // Healthcare states
  const [calcAptTriage, setCalcAptTriage] = useState<string>("normal");
  const [calcAptDoctor, setCalcAptDoctor] = useState<string>("");
  const [calcAptConsent, setCalcAptConsent] = useState<boolean>(true);

  // Manufacturing states
  const [calcManRaw, setCalcManRaw] = useState<string>("");
  const [calcManLabor, setCalcManLabor] = useState<string>("");
  const [calcManMarkup, setCalcManMarkup] = useState<string>("20");

  // Consulting states
  const [calcConsRate, setCalcConsRate] = useState<string>("");
  const [calcConsHours, setCalcConsHours] = useState<string>("");
  const [calcConsBuffer, setCalcConsBuffer] = useState<string>("10");

  // E-commerce states
  const [calcEcoValue, setCalcEcoValue] = useState<string>("");
  const [calcEcoDiscount, setCalcEcoDiscount] = useState<string>("0");
  const [calcEcoLoyalty, setCalcEcoLoyalty] = useState<boolean>(false);

  // Finance states
  const [calcFinLoan, setCalcFinLoan] = useState<string>("");
  const [calcFinCommPct, setCalcFinCommPct] = useState<string>("1.5");
  const [calcFinFee, setCalcFinFee] = useState<string>("2500");

  // Sync state values when deal selection changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCalcBuyRate("");
      setCalcSellRate("");
      setCalcMode("ocean");
      setCalcSaaSRate("");
      setCalcSaaSSeats("");
      setCalcSaaSMonths("12");
      setCalcPropPrice("");
      setCalcCommPct("2");
      setCalcAgentSplit("70");
      setCalcAptTriage("normal");
      setCalcAptDoctor("");
      setCalcAptConsent(true);
      setCalcManRaw("");
      setCalcManLabor("");
      setCalcManMarkup("20");
      setCalcConsRate("");
      setCalcConsHours("");
      setCalcConsBuffer("10");
      setCalcEcoValue("");
      setCalcEcoDiscount("0");
      setCalcEcoLoyalty(false);
      setCalcFinLoan("");
      setCalcFinCommPct("1.5");
      setCalcFinFee("2500");
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedDeal]);

  // New Deal Modal states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    value: "",
    stageId: "",
    contactId: "none",
    companyId: "none",
    expectedCloseDate: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Calendar navigation states
  const [currentDate, setCurrentDate] = useState(new Date());

  // Re-fetch deals when pipeline changes
  const handlePipelineChange = async (pipelineId: string) => {
    const pipe = pipelines.find((p) => p.id === pipelineId) || null;
    setActivePipeline(pipe);
    if (pipe) {
      try {
        const fetchedDeals = await getDeals(pipe.id);
        setDeals(fetchedDeals as Deal[]);
      } catch (err: any) {
        toast.error("Failed to load deals for pipeline");
      }
    }
  };

  useEffect(() => {
    if (activePipeline) {
      const timer = setTimeout(() => {
        handlePipelineChange(activePipeline.id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync highlight deal from URL parameter
  useEffect(() => {
    if (highlightId) {
      const match = deals.find((d) => d.id === highlightId);
      if (match) {
        const timer = setTimeout(() => {
          setSelectedDeal(match);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightId, deals]);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      toast.error("Deal Title is required");
      return;
    }
    if (!createForm.stageId) {
      toast.error("Pipeline stage is required");
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        title: createForm.title.trim(),
        value: Number(createForm.value) || 0,
        pipelineId: activePipeline!.id,
        stageId: createForm.stageId,
        contactId: createForm.contactId === "none" ? undefined : createForm.contactId,
        companyId: createForm.companyId === "none" ? undefined : createForm.companyId,
        expectedCloseDate: createForm.expectedCloseDate || undefined,
      };

      const newDeal = await createDeal(payload);
      
      // Map associations locally
      const matchedContact = contacts.find((ct) => ct.id === newDeal.contactId);
      const matchedCompany = companies.find((cp) => cp.id === newDeal.companyId);
      const matchedStage = activePipeline?.stages.find((st) => st.id === newDeal.stageId);

      const dealWithRelations: Deal = {
        ...newDeal,
        contact: matchedContact ? { id: matchedContact.id, firstName: matchedContact.firstName, lastName: matchedContact.lastName } : null,
        company: matchedCompany ? { id: matchedCompany.id, name: matchedCompany.name } : null,
        stage: matchedStage ? { id: matchedStage.id, name: matchedStage.name, type: matchedStage.type, color: matchedStage.color } : null,
      };

      setDeals((prev) => [dealWithRelations, ...prev]);
      setShowCreateDialog(false);
      setCreateForm({
        title: "",
        value: "",
        stageId: "",
        contactId: "none",
        companyId: "none",
        expectedCloseDate: "",
      });
      toast.success("Deal created successfully");
      setSelectedDeal(dealWithRelations);
    } catch (err: any) {
      toast.error(err.message || "Failed to create deal");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleMoveStage = async (dealId: string, nextStageId: string) => {
    const activeDeal = deals.find((d) => d.id === dealId);
    if (!activeDeal || activeDeal.stageId === nextStageId) return;

    // Optimistic update
    const previousDeals = [...deals];
    const targetStage = activePipeline?.stages.find((s) => s.id === nextStageId);
    
    const updatedLocal = deals.map((d) => {
      if (d.id === dealId) {
        return {
          ...d,
          stageId: nextStageId,
          stage: targetStage ? { id: targetStage.id, name: targetStage.name, type: targetStage.type, color: targetStage.color } : d.stage,
        };
      }
      return d;
    });
    setDeals(updatedLocal);

    try {
      const res = await updateDeal(dealId, { stageId: nextStageId });
      toast.success(`Deal moved to ${targetStage?.name || "new stage"}`);
      
      // Update selected deal detail sheet if it matches
      if (selectedDeal?.id === dealId) {
        const fullUpdated = { ...selectedDeal, stageId: nextStageId, stage: targetStage || selectedDeal.stage };
        setSelectedDeal(fullUpdated);
      }
    } catch (err: any) {
      setDeals(previousDeals);
      toast.error(err.message || "Failed to update deal stage");
    }
  };

  const handleApplyValue = async (dealId: string, value: number, sourceLabel: string = "calculator") => {
    const previousDeals = [...deals];
    const updatedLocal = deals.map((d) => {
      if (d.id === dealId) {
        return {
          ...d,
          value,
        };
      }
      return d;
    });
    setDeals(updatedLocal);

    if (selectedDeal?.id === dealId) {
      setSelectedDeal({ ...selectedDeal, value });
    }

    try {
      await updateDeal(dealId, { value });
      toast.success(`Deal value updated via ${sourceLabel}: ₹${value.toLocaleString("en-IN")}`);
    } catch (err: any) {
      setDeals(previousDeals);
      if (selectedDeal?.id === dealId) {
        setSelectedDeal(selectedDeal);
      }
      toast.error(err.message || "Failed to update deal value");
    }
  };

  const handleLogNote = async () => {
    if (!selectedDeal || !noteBody.trim()) return;
    setNoteLoading(true);
    try {
      await createActivity({
        type: "note",
        body: noteBody.trim(),
        relatedDealId: selectedDeal.id,
        relatedContactId: selectedDeal.contactId || undefined,
        relatedCompanyId: selectedDeal.companyId || undefined,
      });

      setNoteBody("");
      setTimelineRefresh((prev) => prev + 1);
      toast.success("Timeline log recorded");
    } catch (err: any) {
      toast.error(err.message || "Failed to record log");
    } finally {
      setNoteLoading(false);
    }
  };

  const handleDeleteDeal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this deal? All timeline logs specific to this deal will be deleted.")) {
      return;
    }

    try {
      await deleteDeal(id);
      setDeals((prev) => prev.filter((d) => d.id !== id));
      if (selectedDeal?.id === id) {
        setSelectedDeal(null);
        router.push("/dashboard/deals");
      }
      toast.success("Deal deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete deal");
    }
  };

  // Heuristic forecast calculation
  const getForecastValue = () => {
    return deals.reduce((sum, d) => {
      const isClosed = d.stage?.type === "won" || d.stage?.type === "lost";
      if (d.stage?.type === "lost") return sum;
      // Closed won = 100%, otherwise weight by stage probability
      const weight = d.stage?.type === "won" ? 1.0 : d.probability / 100;
      return sum + d.value * weight;
    }, 0);
  };

  // Calendar generation helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  const days = getDaysInMonth(currentDate);
  const startDayOffset = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" /> Deals
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Organize pipelines, drag cards, and track forecast revenue.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pipelines.length > 1 && activePipeline && (
            <Select
              value={activePipeline.id}
              onValueChange={(val) => handlePipelineChange(val as string)}
            >
              <SelectTrigger className="w-48 bg-card border-border">
                <SelectValue placeholder="Pipeline" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex rounded-md overflow-hidden border border-border bg-card p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`p-1.5 rounded-sm text-xs flex items-center gap-1 transition-colors ${
                view === "kanban" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kanban</span>
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-1.5 rounded-sm text-xs flex items-center gap-1 transition-colors ${
                view === "table" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Table</span>
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`p-1.5 rounded-sm text-xs flex items-center gap-1 transition-colors ${
                view === "calendar" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Calendar</span>
            </button>
          </div>

          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Deal
          </Button>
        </div>
      </div>

      {/* Stats and Forecast values */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Pipeline Value",
            value: `₹${deals.reduce((s, d) => s + d.value, 0).toLocaleString("en-IN")}`,
            sub: `${deals.length} deals total`,
          },
          {
            label: "Weighted Forecast",
            value: `₹${getForecastValue().toLocaleString("en-IN")}`,
            sub: "Stage weighted estimates",
          },
          {
            label: "Closed Won",
            value: `₹${deals
              .filter((d) => d.stage?.type === "won")
              .reduce((s, d) => s + d.value, 0)
              .toLocaleString("en-IN")}`,
            sub: "Total won revenue",
          },
          {
            label: "Open Opportunities",
            value: deals.filter((d) => d.stage?.type === "open").length,
            sub: "Currently active deals",
          },
        ].map((s) => (
          <Card key={s.label} className="border border-border bg-card">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="text-lg font-bold text-foreground font-mono mt-1">{s.value}</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board View */}
      {view === "kanban" && activePipeline && (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {activePipeline.stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stageId === stage.id);
            const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedDealId) {
                    handleMoveStage(draggedDealId, stage.id);
                    setDraggedDealId(null);
                  }
                }}
                className={cn(
                  "w-72 shrink-0 rounded-xl border flex flex-col max-h-[72vh] transition-all duration-200",
                  draggedDealId 
                    ? "border-primary/25 bg-primary/[0.02] shadow-xs" 
                    : "border-border/60 bg-muted/10 dark:bg-muted/5 shadow-xs"
                )}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-border bg-card/40 flex items-center justify-between backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="font-semibold text-xs text-foreground truncate max-w-[120px]">
                      {stage.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono bg-muted border border-border/50 px-1.5 py-0.2 rounded-full">
                      {stageDeals.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ₹{totalValue.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Deal Cards Container */}
                <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-[120px] scrollbar-thin">
                  {stageDeals.map((d) => (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={() => setDraggedDealId(d.id)}
                      onDragEnd={() => setDraggedDealId(null)}
                      onClick={() => setSelectedDeal(d)}
                      className={cn(
                        "p-3 rounded-lg border bg-card hover-lift cursor-pointer shadow-xs transition-all duration-200 relative overflow-hidden pl-4.5 group",
                        draggedDealId === d.id ? "opacity-35 scale-95" : "hover:border-primary/30 border-border/80"
                      )}
                    >
                      {/* Left border indicator using stage color */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-[3px]" 
                        style={{ backgroundColor: stage.color || "#3b82f6" }} 
                      />
                      
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground text-xs leading-normal line-clamp-2">
                          {d.title}
                        </p>
                        {d.healthFlags.includes("stale_deal") && (
                          <span title="Stale deal — no activity">
                            <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0" />
                          </span>
                        )}
                      </div>
                      
                      {d.company && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          {d.company.name}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[10px]">
                        <span className="font-mono text-foreground font-semibold">
                          ₹{d.value.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[9px] text-muted-foreground/80 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {d.probability}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="py-8 text-center text-[10px] text-muted-foreground/60 italic">
                      Drag deals here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Deal Title</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Deal Value</th>
                <th className="px-4 py-3 font-semibold">Probability</th>
                <th className="px-4 py-3 font-semibold">Contact / Company</th>
                <th className="px-4 py-3 font-semibold">Expected Close</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {deals.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => setSelectedDeal(d)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{d.title}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: d.stage?.color || "#64748B" }}
                      />
                      {d.stage?.name || "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold">
                    ₹{d.value.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{d.probability}%</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="space-y-0.5">
                      {d.contact && (
                        <div className="flex items-center gap-1 text-[11px]"><User className="w-3 h-3" /> {d.contact.firstName}</div>
                      )}
                      {d.company && (
                        <div className="flex items-center gap-1 text-[11px]"><Building2 className="w-3 h-3" /> {d.company.name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">
                    {d.expectedCloseDate || "—"}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDeleteDeal(d.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {deals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No deals found in this pipeline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar view */}
      {view === "calendar" && (
        <Card className="border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">
              {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() =>
                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() =>
                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 border-b border-border pb-2 text-center text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mt-2">
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="min-h-16 bg-muted/10 rounded-sm border border-transparent" />
            ))}
            {days.map((day) => {
              const dayStr = day.toISOString().slice(0, 10);
              const dayDeals = deals.filter((d) => d.expectedCloseDate === dayStr);

              return (
                <div
                  key={dayStr}
                  className="min-h-20 p-1.5 bg-muted/20 border border-border/40 rounded-sm flex flex-col justify-between"
                >
                  <span className="text-[10px] font-mono text-muted-foreground">{day.getDate()}</span>
                  <div className="space-y-1 overflow-y-auto max-h-12 scrollbar-none mt-1">
                    {dayDeals.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDeal(d)}
                        style={{ borderLeftColor: d.stage?.color || "#2F5DFF" }}
                        className="px-1 py-0.5 border-l-2 bg-card rounded text-[9px] text-foreground font-medium truncate cursor-pointer shadow-sm hover:border-l-primary"
                        title={d.title}
                      >
                        {d.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Creation Modal */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Add Deal</DialogTitle>
            <DialogDescription>
              Create a new deal opportunity in the pipeline.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDeal} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Deal Title *</Label>
              <Input
                id="title"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. Acme 10x Fleet Deal"
                disabled={createLoading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="value">Deal Value (INR) *</Label>
              <Input
                id="value"
                type="number"
                value={createForm.value}
                onChange={(e) => setCreateForm({ ...createForm, value: e.target.value })}
                placeholder="e.g. 500000"
                disabled={createLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="stage">Initial Stage *</Label>
                <Select
                  value={createForm.stageId}
                  onValueChange={(val) => setCreateForm({ ...createForm, stageId: val as string })}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {activePipeline?.stages.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="expectedCloseDate">Expected Close</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  value={createForm.expectedCloseDate}
                  onChange={(e) => setCreateForm({ ...createForm, expectedCloseDate: e.target.value })}
                  disabled={createLoading}
                  className="bg-card"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="contact">Contact Partner</Label>
              <Select
                value={createForm.contactId}
                onValueChange={(val) => setCreateForm({ ...createForm, contactId: val as string })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Link a contact" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">Unlinked / None</SelectItem>
                  {contacts.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.firstName} {ct.lastName || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="company">Company Account</Label>
              <Select
                value={createForm.companyId}
                onValueChange={(val) => setCreateForm({ ...createForm, companyId: val as string })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Link a company" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">Unlinked / None</SelectItem>
                  {companies.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateDialog(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Creating..." : "Create Deal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Side Sheet Panel */}
      <Sheet open={!!selectedDeal} onOpenChange={(o) => { if (!o) setSelectedDeal(null); }}>
        {selectedDeal && (
          <SheetContent className="w-full sm:max-w-lg bg-card border-l border-border flex flex-col p-0 z-50">
            <SheetHeader className="p-6 border-b border-border bg-muted/20">
              <SheetTitle className="text-lg font-bold text-foreground">
                {selectedDeal.title}
              </SheetTitle>
              {selectedDeal.company && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Company: </span>
                  <span className="text-primary font-semibold">{selectedDeal.company.name}</span>
                </p>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Detailed Financial details */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Financial details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px]">Deal Value</span>
                    <p className="font-mono text-foreground font-semibold text-sm">
                      ₹{selectedDeal.value.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px]">Probability</span>
                    <p className="font-mono text-foreground">{selectedDeal.probability}%</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px]">Expected Close Date</span>
                    <p className="text-foreground">{selectedDeal.expectedCloseDate || "—"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px]">Status</span>
                    <p className="text-foreground capitalize">{selectedDeal.stage?.type || "Open"}</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  WhatsApp conversational actions
                </h4>
                <div className="p-3 rounded-lg border border-border bg-emerald-500/5 flex flex-col sm:flex-row gap-2 justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600/10 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Follow-up with client</p>
                      <p className="text-[9px] text-muted-foreground">Log dispatch or Invoice</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 w-full sm:w-auto">
                    <Button
                      size="xs"
                      onClick={async () => {
                        try {
                          const { sendMessage } = await import("@/app/actions/messages");
                          await sendMessage({
                            contactId: selectedDeal.contactId || undefined,
                            content: `Hi, following up on ${selectedDeal.title}. Let us know if you'd like to schedule a quick sync!`,
                            channel: "whatsapp",
                          });
                          toast.success(`WhatsApp follow-up dispatched & logged to deal timeline for: ${selectedDeal.title}`);
                        } catch (err) {
                          toast.error("Failed to dispatch WhatsApp follow-up");
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] h-7 px-2.5 flex-1 sm:flex-initial"
                    >
                      💬 Nudge Lead
                    </Button>
                    <Button
                      size="xs"
                      onClick={async () => {
                        try {
                          const { createBusinessOsInvoice } = await import("@/app/actions/business-os");
                          if (selectedDeal.contactId) {
                            await createBusinessOsInvoice({
                              dealId: selectedDeal.id,
                              clientId: selectedDeal.contactId,
                              amount: selectedDeal.value,
                            });
                          }
                          toast.success(`Invoice created & shared for Deal value: ₹${selectedDeal.value.toLocaleString("en-IN")}`);
                        } catch (err) {
                          toast.error("Failed to generate invoice");
                        }
                      }}
                      className="variant-outline text-[10px] h-7 px-2.5 flex-1 sm:flex-initial border border-border bg-background hover:bg-muted"
                    >
                      💵 Share Invoice
                    </Button>
                  </div>
                </div>
              </div>

              {/* Vertical Specific Helper Panels */}
              {businessType === "logistics" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Cargo Rate Margin Calculator
                  </h4>
                  <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="calcBuy" className="text-[10px]">Buy Rate (Carrier Cost)</Label>
                        <Input
                          id="calcBuy"
                          type="number"
                          placeholder="e.g. 500000"
                          value={calcBuyRate}
                          onChange={(e) => setCalcBuyRate(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="calcSell" className="text-[10px]">Sell Rate (Shipper Price)</Label>
                        <Input
                          id="calcSell"
                          type="number"
                          placeholder="e.g. 650000"
                          value={calcSellRate}
                          onChange={(e) => setCalcSellRate(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs items-center">
                      <div className="space-y-1">
                        <Label htmlFor="calcMode" className="text-[10px]">Carrier Mode</Label>
                        <select
                          id="calcMode"
                          value={calcMode}
                          onChange={(e) => setCalcMode(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none cursor-pointer"
                        >
                          <option value="ocean">🚢 Ocean Freight</option>
                          <option value="air">✈️ Air Cargo</option>
                          <option value="road">🚛 Road Transport</option>
                          <option value="rail">🎛️ Rail Cargo</option>
                        </select>
                      </div>

                      {/* Calculated values indicators */}
                      {Number(calcSellRate) > 0 && (
                        <div className="space-y-0.5 pt-2 text-right">
                          <span className="text-[10px] text-muted-foreground block">Net Profit Margin</span>
                          <span className="font-mono text-xs font-bold text-success">
                            ₹{(Number(calcSellRate) - Number(calcBuyRate)).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono block">
                            ({((Number(calcSellRate) - Number(calcBuyRate)) / Number(calcSellRate) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    </div>

                    {Number(calcSellRate) > Number(calcBuyRate) && (
                      <Button
                        size="sm"
                        onClick={() => handleApplyValue(selectedDeal.id, Number(calcSellRate) - Number(calcBuyRate), "Logistics Profit Margin")}
                        className="w-full bg-ai hover:bg-ai/90 text-ai-foreground text-xs mt-2 border border-ai/20"
                      >
                        Apply Profit Margin to Deal Value
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {businessType === "saas" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    SaaS Subscription Calculator
                  </h4>
                  <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="saasRate" className="text-[10px]">Seat Cost / mo</Label>
                        <Input
                          id="saasRate"
                          type="number"
                          placeholder="e.g. 1500"
                          value={calcSaaSRate}
                          onChange={(e) => setCalcSaaSRate(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="saasSeats" className="text-[10px]">Active Seats</Label>
                        <Input
                          id="saasSeats"
                          type="number"
                          placeholder="e.g. 25"
                          value={calcSaaSSeats}
                          onChange={(e) => setCalcSaaSSeats(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="saasMonths" className="text-[10px]">Months Term</Label>
                        <Input
                          id="saasMonths"
                          type="number"
                          placeholder="e.g. 12"
                          value={calcSaaSMonths}
                          onChange={(e) => setCalcSaaSMonths(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                    </div>

                    {Number(calcSaaSRate) > 0 && Number(calcSaaSSeats) > 0 && (
                      <div className="flex justify-between items-center bg-card p-2 rounded border border-border">
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-semibold">Monthly MRR</span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            ₹{(Number(calcSaaSRate) * Number(calcSaaSSeats)).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block font-semibold">Contract TCV Value</span>
                          <span className="font-mono text-xs font-bold text-primary">
                            ₹{(Number(calcSaaSRate) * Number(calcSaaSSeats) * Number(calcSaaSMonths)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}

                    {Number(calcSaaSRate) > 0 && Number(calcSaaSSeats) > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleApplyValue(selectedDeal.id, Number(calcSaaSRate) * Number(calcSaaSSeats) * Number(calcSaaSMonths), "SaaS TCV Calculator")}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs mt-2"
                      >
                        Apply TCV to Deal Value
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {businessType === "real_estate" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Property Commission Split Calculator
                  </h4>
                  <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="propPrice" className="text-[10px]">Property Value</Label>
                        <Input
                          id="propPrice"
                          type="number"
                          placeholder="e.g. 15000000"
                          value={calcPropPrice}
                          onChange={(e) => setCalcPropPrice(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="commPct" className="text-[10px]">Comm %</Label>
                        <Input
                          id="commPct"
                          type="number"
                          placeholder="e.g. 2"
                          value={calcCommPct}
                          onChange={(e) => setCalcCommPct(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="agentSplit" className="text-[10px]">Agent Split %</Label>
                        <Input
                          id="agentSplit"
                          type="number"
                          placeholder="e.g. 70"
                          value={calcAgentSplit}
                          onChange={(e) => setCalcAgentSplit(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                    </div>

                    {Number(calcPropPrice) > 0 && (
                      <div className="flex justify-between items-center bg-card p-2 rounded border border-border">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Gross Comm</span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            ₹{(Number(calcPropPrice) * (Number(calcCommPct) / 100)).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Net Agency Share</span>
                          <span className="font-mono text-xs font-bold text-primary">
                            ₹{(Number(calcPropPrice) * (Number(calcCommPct) / 100) * (Number(calcAgentSplit) / 100)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}

                    {Number(calcPropPrice) > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleApplyValue(selectedDeal.id, Number(calcPropPrice) * (Number(calcCommPct) / 100) * (Number(calcAgentSplit) / 100), "Real Estate Split Calculator")}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs mt-2"
                      >
                        Apply Net Share to Deal
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {businessType === "healthcare" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Patient Intake Triage Checklist
                  </h4>
                  <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-3 text-xs">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="consentCheck"
                        checked={calcAptConsent}
                        onChange={(e) => setCalcAptConsent(e.target.checked)}
                        className="w-3.5 h-3.5 text-primary border-input rounded"
                      />
                      <label htmlFor="consentCheck" className="text-[10px] font-semibold select-none cursor-pointer">
                        HIPAA Data Share Consent On File
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="aptDoctor" className="text-[10px]">Triage Class</Label>
                        <select
                          value={calcAptTriage}
                          onChange={(e) => setCalcAptTriage(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                        >
                          <option value="normal">🟢 Normal Priority</option>
                          <option value="urgent">🟡 Urgent Attention</option>
                          <option value="critical">🔴 Emergency / Critical</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="aptPhysician" className="text-[10px]">Physician Specialty</Label>
                        <Input
                          id="aptPhysician"
                          placeholder="e.g. Cardiology"
                          value={calcAptDoctor}
                          onChange={(e) => setCalcAptDoctor(e.target.value)}
                          className="h-8 bg-background text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>Verification:</span>
                      <span className={calcAptConsent ? "text-success font-semibold" : "text-destructive font-semibold animate-pulse"}>
                        {calcAptConsent ? "Passed Compliance" : "Pending HIPAA Sign-off"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {businessType === "manufacturing" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    BOM CPQ Cost Aggregator
                  </h4>
                  <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="manRaw" className="text-[10px]">Material Cost</Label>
                        <Input
                          id="manRaw"
                          type="number"
                          placeholder="e.g. 80000"
                          value={calcManRaw}
                          onChange={(e) => setCalcManRaw(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="manLabor" className="text-[10px]">Labor Hours</Label>
                        <Input
                          id="manLabor"
                          type="number"
                          placeholder="e.g. 50"
                          value={calcManLabor}
                          onChange={(e) => setCalcManLabor(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="manMarkup" className="text-[10px]">Markup %</Label>
                        <Input
                          id="manMarkup"
                          type="number"
                          placeholder="e.g. 20"
                          value={calcManMarkup}
                          onChange={(e) => setCalcManMarkup(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                    </div>

                    {Number(calcManRaw) > 0 && (
                      <div className="flex justify-between items-center bg-card p-2 rounded border border-border">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Aggregated Cost</span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            ₹{(Number(calcManRaw) + (Number(calcManLabor) * 1200)).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Customer Quote</span>
                          <span className="font-mono text-xs font-bold text-primary">
                            ₹{((Number(calcManRaw) + (Number(calcManLabor) * 1200)) * (1 + Number(calcManMarkup) / 100)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}

                    {Number(calcManRaw) > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleApplyValue(selectedDeal.id, (Number(calcManRaw) + (Number(calcManLabor) * 1200)) * (1 + Number(calcManMarkup) / 100), "CPQ Manufacturing Costing")}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs mt-2"
                      >
                        Apply CPQ Cost to Deal
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {businessType === "consulting" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Project Scope Rate Estimator
                  </h4>
                  <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="consRate" className="text-[10px]">Blended Rate (hr)</Label>
                        <Input
                          id="consRate"
                          type="number"
                          placeholder="e.g. 5000"
                          value={calcConsRate}
                          onChange={(e) => setCalcConsRate(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="consHours" className="text-[10px]">Estimated Hrs</Label>
                        <Input
                          id="consHours"
                          type="number"
                          placeholder="e.g. 120"
                          value={calcConsHours}
                          onChange={(e) => setCalcConsHours(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="consBuffer" className="text-[10px]">Buffer %</Label>
                        <Input
                          id="consBuffer"
                          type="number"
                          placeholder="e.g. 10"
                          value={calcConsBuffer}
                          onChange={(e) => setCalcConsBuffer(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                    </div>

                    {Number(calcConsRate) > 0 && Number(calcConsHours) > 0 && (
                      <div className="flex justify-between items-center bg-card p-2 rounded border border-border">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Base Project Fee</span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            ₹{(Number(calcConsRate) * Number(calcConsHours)).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Total Project Estimate</span>
                          <span className="font-mono text-xs font-bold text-primary">
                            ₹{((Number(calcConsRate) * Number(calcConsHours)) * (1 + Number(calcConsBuffer) / 100)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}

                    {Number(calcConsRate) > 0 && Number(calcConsHours) > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleApplyValue(selectedDeal.id, (Number(calcConsRate) * Number(calcConsHours)) * (1 + Number(calcConsBuffer) / 100), "Consulting Scope Estimator")}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs mt-2"
                      >
                        Apply Scope Estimate to Deal
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {businessType === "ecommerce" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Cart Basket & Discount Estimator
                  </h4>
                  <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="ecoValue" className="text-[10px]">Cart Subtotal (₹)</Label>
                        <Input
                          id="ecoValue"
                          type="number"
                          placeholder="e.g. 24500"
                          value={calcEcoValue}
                          onChange={(e) => setCalcEcoValue(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="ecoDiscount" className="text-[10px]">Applied Promo %</Label>
                        <Input
                          id="ecoDiscount"
                          type="number"
                          placeholder="e.g. 15"
                          value={calcEcoDiscount}
                          onChange={(e) => setCalcEcoDiscount(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ecoLoyalty"
                        checked={calcEcoLoyalty}
                        onChange={(e) => setCalcEcoLoyalty(e.target.checked)}
                        className="w-3.5 h-3.5 text-primary border-input rounded"
                      />
                      <label htmlFor="ecoLoyalty" className="text-[10px] font-semibold select-none cursor-pointer">
                        Apply Loyalty Club Discount (Additional 5%)
                      </label>
                    </div>

                    {Number(calcEcoValue) > 0 && (
                      <div className="flex justify-between items-center bg-card p-2 rounded border border-border text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Net Discount Value</span>
                          <span className="font-mono text-xs font-bold text-destructive">
                            ₹{(Number(calcEcoValue) * ((Number(calcEcoDiscount) + (calcEcoLoyalty ? 5 : 0)) / 100)).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Checkout Cart Total</span>
                          <span className="font-mono text-xs font-bold text-success">
                            ₹{(Number(calcEcoValue) * (1 - (Number(calcEcoDiscount) + (calcEcoLoyalty ? 5 : 0)) / 100)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}

                    {Number(calcEcoValue) > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleApplyValue(selectedDeal.id, Number(calcEcoValue) * (1 - (Number(calcEcoDiscount) + (calcEcoLoyalty ? 5 : 0)) / 100), "D2C Checkout Calculator")}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs mt-2"
                      >
                        Apply Net Cart Total to Deal
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {businessType === "finance" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Loan Processing & Fee Estimator
                  </h4>
                  <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="finLoan" className="text-[10px]">Loan Capital</Label>
                        <Input
                          id="finLoan"
                          type="number"
                          placeholder="e.g. 5000000"
                          value={calcFinLoan}
                          onChange={(e) => setCalcFinLoan(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="finComm" className="text-[10px]">Broker Comm %</Label>
                        <Input
                          id="finComm"
                          type="number"
                          placeholder="e.g. 1.5"
                          value={calcFinCommPct}
                          onChange={(e) => setCalcFinCommPct(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="finFee" className="text-[10px]">Admin Fee (₹)</Label>
                        <Input
                          id="finFee"
                          type="number"
                          placeholder="e.g. 2500"
                          value={calcFinFee}
                          onChange={(e) => setCalcFinFee(e.target.value)}
                          className="h-8 bg-background font-mono text-xs"
                        />
                      </div>
                    </div>

                    {Number(calcFinLoan) > 0 && (
                      <div className="flex justify-between items-center bg-card p-2 rounded border border-border">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Calculated Commission</span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            ₹{(Number(calcFinLoan) * (Number(calcFinCommPct) / 100)).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Net Broker Margin</span>
                          <span className="font-mono text-xs font-bold text-primary">
                            ₹{((Number(calcFinLoan) * (Number(calcFinCommPct) / 100)) + Number(calcFinFee)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}

                    {Number(calcFinLoan) > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleApplyValue(selectedDeal.id, (Number(calcFinLoan) * (Number(calcFinCommPct) / 100)) + Number(calcFinFee), "Broker Fee Estimator")}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs mt-2"
                      >
                        Apply Net Commission to Deal
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Stage selector controls */}
              {activePipeline && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Current Stage
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activePipeline.stages.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => handleMoveStage(selectedDeal.id, st.id)}
                        style={{
                          borderColor: selectedDeal.stageId === st.id ? st.color : undefined,
                          backgroundColor: selectedDeal.stageId === st.id ? `${st.color}15` : undefined,
                          color: selectedDeal.stageId === st.id ? st.color : undefined,
                        }}
                        className={`px-2.5 py-1.5 rounded-md text-xs border border-border text-muted-foreground hover:border-muted-foreground/60 transition-colors font-medium`}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick note logger */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Log Deal Update
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Log a note about this deal..."
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogNote()}
                    disabled={noteLoading}
                    className="flex-1 bg-background text-xs"
                  />
                  <Button size="sm" onClick={handleLogNote} disabled={noteLoading}>
                    {noteLoading ? "Logging..." : "Log"}
                  </Button>
                </div>
              </div>

              {/* Activity Timeline specific to deal */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Timeline History
                </h4>
                <ActivityTimeline
                  dealId={selectedDeal.id}
                  refreshTrigger={timelineRefresh}
                />
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
