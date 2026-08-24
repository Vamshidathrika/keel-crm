"use client";

import React, { useState } from "react";
import {
  ListOrdered,
  Plus,
  Mail,
  Phone,
  MessageSquare,
  CheckSquare,
  ArrowRight,
  Check,
  Users,
  Play,
  Pause,
  Loader2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCadence, advanceCadenceStep, getCadences } from "@/app/actions/cadences";
import { toast } from "sonner";

interface CadencesClientProps {
  user: any;
  initialCadences: any[];
}

export default function CadencesClient({ user, initialCadences }: CadencesClientProps) {
  const [cadences, setCadences] = useState<any[]>(initialCadences || []);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  // Form State
  const [cadenceName, setCadenceName] = useState("");
  const [targetAudience, setTargetAudience] = useState("Inbound Enterprise Leads");
  const [description, setDescription] = useState("");

  const handleCreateCadence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cadenceName.trim()) return;

    setIsSaving(true);
    try {
      const defaultSteps = [
        {
          stepNumber: 1,
          dayOffset: 1,
          type: "email" as const,
          title: "Introduction & Value Proposition",
          instruction: "Send tailored introduction email highlighting key fleet advantages.",
          cannedTemplate: "Hi {{firstName}}, I noticed your recent logistics inquiry...",
        },
        {
          stepNumber: 2,
          dayOffset: 2,
          type: "call" as const,
          title: "Discovery Phone Call",
          instruction: "Call executive sponsor to understand shipping volume & timeline.",
        },
        {
          stepNumber: 3,
          dayOffset: 4,
          type: "whatsapp" as const,
          title: "Proposal Overview & WhatsApp Share",
          instruction: "Share executive summary proposal via WhatsApp message.",
        },
      ];

      const res = await createCadence({
        name: cadenceName,
        targetAudience,
        description,
        steps: defaultSteps,
      });

      if (res.success) {
        toast.success("Sales cadence blueprint created!");
        const refreshed = await getCadences();
        setCadences(refreshed);
        setIsCreateOpen(false);
        setCadenceName("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create cadence.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdvanceStep = async (enrollmentId: string) => {
    setAdvancingId(enrollmentId);
    try {
      const res = await advanceCadenceStep(enrollmentId);
      if (res.success) {
        toast.success(res.completed ? "Cadence completed for this lead!" : `Advanced to Step ${res.nextStep}!`);
        const refreshed = await getCadences();
        setCadences(refreshed);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to advance step.");
    } finally {
      setAdvancingId(null);
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="w-3.5 h-3.5 text-blue-500" />;
      case "call":
        return <Phone className="w-3.5 h-3.5 text-emerald-500" />;
      case "whatsapp":
        return <MessageSquare className="w-3.5 h-3.5 text-green-500" />;
      default:
        return <CheckSquare className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              <ListOrdered className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Sales Cadences & Sequence Execution
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
              Outreach Playbooks
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Structured multi-step sales outreach blueprints. Automatically schedules daily follow-up tasks, calls, and email checkpoints for reps.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5 shadow-sm">
          <Plus className="w-4 h-4" /> Create Cadence
        </Button>
      </div>

      {/* Cadences List */}
      <div className="space-y-4">
        {cadences.length === 0 ? (
          <Card className="border-border/70 p-12 text-center">
            <div className="max-w-md mx-auto space-y-3">
              <ListOrdered className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-sm">No Sales Cadences Active</h3>
              <p className="text-xs text-muted-foreground">
                Create structured multi-step outreach playbooks to guide your SDRs and Account Executives through consistent prospecting cadences.
              </p>
              <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" /> Create First Cadence
              </Button>
            </div>
          </Card>
        ) : (
          cadences.map((cad) => (
            <Card key={cad.id} className="border-border/70 overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-border/40 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">{cad.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {cad.targetAudience}
                      </Badge>
                    </div>
                    {cad.description && (
                      <CardDescription className="text-xs">{cad.description}</CardDescription>
                    )}
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                    {(cad.enrollments || []).length} Leads Enrolled
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Steps Visual Timeline */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                    Execution Steps
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(cad.steps || []).map((st: any) => (
                      <div
                        key={st.id}
                        className="p-3 rounded-lg border border-border/80 bg-card space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5">
                            {getStepIcon(st.type)}
                            Step {st.stepNumber}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Day +{st.dayOffset}
                          </span>
                        </div>
                        <p className="font-medium text-foreground text-[11px] truncate">{st.title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{st.instruction}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enrolled Prospects Active in this Cadence */}
                {(cad.enrollments || []).length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                      Active In-Progress Prospects
                    </span>
                    <div className="space-y-2">
                      {cad.enrollments.map((enr: any) => (
                        <div
                          key={enr.id}
                          className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-foreground">
                              {enr.contact?.firstName} {enr.contact?.lastName || ""}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              Step {enr.currentStep} of {cad.steps.length}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Due: {enr.nextTaskDueAt || "Completed"}
                            </span>
                          </div>

                          {enr.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdvanceStep(enr.id)}
                              disabled={advancingId === enr.id}
                              className="text-xs h-7 gap-1"
                            >
                              {advancingId === enr.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3 text-emerald-500" />
                              )}
                              Complete Step &amp; Advance
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Cadence Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Create Sales Cadence</DialogTitle>
            <DialogDescription className="text-xs">
              Define a repeatable multi-step outreach sequence with automated daily checkpoints.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCadence} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cadName" className="text-xs font-medium">Cadence Name</Label>
              <Input
                id="cadName"
                placeholder="e.g. Enterprise Outbound 7-Day Sprint"
                value={cadenceName}
                onChange={(e) => setCadenceName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aud" className="text-xs font-medium">Target Audience</Label>
              <Input
                id="aud"
                placeholder="e.g. Inbound SaaS Decision Makers"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs font-medium">Description</Label>
              <Input
                id="desc"
                placeholder="Brief objective of this sequence..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] space-y-1">
              <span className="font-semibold block text-foreground">Standard 3-Step Sequence:</span>
              <p className="text-muted-foreground">
                • Day 1: Introduction &amp; Value Proposition Email<br />
                • Day 2: Executive Discovery Call Task<br />
                • Day 4: Proposal Overview via WhatsApp Message
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving || !cadenceName.trim()}>
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Create Sequence
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
