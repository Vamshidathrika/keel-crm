"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Send,
  Building2,
  User,
  Shield,
  Layers,
  Sparkles,
  ArrowUpRight,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { repUpdateTaskStatus } from "@/app/actions/team-allocation";

interface TeamPortalClientProps {
  token: string;
  initialData: {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      maxCapacity: number;
    };
    org: {
      id: string;
      name: string;
      brandingConfig?: any;
    };
    tasks: any[];
    deals: any[];
    activities: any[];
  };
}

export default function TeamPortalClient({ token, initialData }: TeamPortalClientProps) {
  const [tasks, setTasks] = useState(initialData.tasks);
  const [deals, setDeals] = useState(initialData.deals);
  const [activities, setActivities] = useState(initialData.activities);
  const [filter, setFilter] = useState<"pending" | "today_overdue" | "completed">("pending");
  const [activeTab, setActiveTab] = useState<"tasks" | "deals" | "activity">("tasks");

  // Note dialog state
  const [selectedTaskForNote, setSelectedTaskForNote] = useState<any | null>(null);
  const [taskNote, setTaskNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  const orgName = initialData.org.brandingConfig?.appName || initialData.org.name;
  const primaryColor = initialData.org.brandingConfig?.primaryColor || "#2F5DFF";

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const openTasks = tasks.filter((t) => !t.isDone);
  const completedTasks = tasks.filter((t) => t.isDone);
  const overdueTasks = openTasks.filter((t) => t.dueDate && t.dueDate < todayStr);
  const dueTodayTasks = openTasks.filter((t) => t.dueDate && t.dueDate === todayStr);
  const totalPipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "completed") return t.isDone;
    if (filter === "today_overdue") {
      if (t.isDone) return false;
      return t.dueDate && t.dueDate <= todayStr;
    }
    return !t.isDone;
  });

  const handleToggleTask = async (task: any) => {
    const nextState = !task.isDone;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, isDone: nextState, completedAt: nextState ? new Date().toISOString() : null }
          : t
      )
    );

    try {
      await repUpdateTaskStatus(token, task.id, nextState);
      toast.success(nextState ? "Task completed!" : "Task reopened");
    } catch (err: any) {
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, isDone: task.isDone } : t))
      );
      toast.error("Failed to update task");
    }
  };

  const handleSaveTaskNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForNote) return;

    setNoteLoading(true);
    try {
      await repUpdateTaskStatus(token, selectedTaskForNote.id, selectedTaskForNote.isDone, taskNote);
      toast.success("Note saved to CRM activity timeline!");
      setSelectedTaskForNote(null);
      setTaskNote("");
    } catch (err: any) {
      toast.error("Failed to save note");
    } finally {
      setNoteLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            URGENT
          </span>
        );
      case "high":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            HIGH
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-muted text-muted-foreground border border-border">
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Branded Navigation Bar */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              {orgName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{orgName}</span>
                <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[9px] font-mono font-semibold uppercase">
                  Rep Work Desk
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Logged in as {initialData.user.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline-block font-mono text-muted-foreground text-[11px]">
              {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <ThemeToggle />
            <div className="h-4 w-px bg-border hidden sm:block" />
            <span className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-mono capitalize">
              Role: {initialData.user.role}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-card to-muted/30 p-5 rounded-2xl border border-border shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-foreground">Welcome back, {initialData.user.name} 👋</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Here is your daily action queue, assigned pipeline deals, and milestone follow-ups.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filter === "today_overdue" ? "default" : "outline"}
              onClick={() => {
                setActiveTab("tasks");
                setFilter("today_overdue");
              }}
              className="text-xs gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Due / Overdue ({dueTodayTasks.length + overdueTasks.length})
            </Button>
          </div>
        </div>

        {/* Action Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border bg-card p-3 shadow-xs">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Open Action Items</p>
            <p className="text-xl font-bold font-mono mt-1 text-foreground">{openTasks.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{completedTasks.length} Completed</p>
          </Card>

          <Card className="border border-border bg-card p-3 shadow-xs">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Overdue Warnings</p>
            <p
              className={`text-xl font-bold font-mono mt-1 ${
                overdueTasks.length > 0 ? "text-rose-500 font-black" : "text-muted-foreground"
              }`}
            >
              {overdueTasks.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Need immediate action</p>
          </Card>

          <Card className="border border-border bg-card p-3 shadow-xs">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Active Deals</p>
            <p className="text-xl font-bold font-mono mt-1 text-foreground">{deals.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">In current pipeline</p>
          </Card>

          <Card className="border border-border bg-card p-3 shadow-xs">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Pipeline Value</p>
            <p className="text-xl font-bold font-mono mt-1 text-primary">
              ${totalPipelineValue.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Under management</p>
          </Card>
        </div>

        {/* View Switcher */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "tasks" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("tasks")}
              className="text-xs gap-1.5 font-semibold"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Assigned Tasks ({openTasks.length})
            </Button>
            <Button
              variant={activeTab === "deals" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("deals")}
              className="text-xs gap-1.5 font-semibold"
            >
              <DollarSign className="w-3.5 h-3.5" /> My Deals ({deals.length})
            </Button>
            <Button
              variant={activeTab === "activity" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("activity")}
              className="text-xs gap-1.5 font-semibold"
            >
              <Clock className="w-3.5 h-3.5" /> Activity Log
            </Button>
          </div>

          {activeTab === "tasks" && (
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setFilter("pending")}
                className={`px-2 py-1 rounded text-[11px] font-mono ${
                  filter === "pending"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                All Open ({openTasks.length})
              </button>
              <button
                onClick={() => setFilter("today_overdue")}
                className={`px-2 py-1 rounded text-[11px] font-mono ${
                  filter === "today_overdue"
                    ? "bg-amber-500 text-white font-bold"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Due Today / Overdue
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`px-2 py-1 rounded text-[11px] font-mono ${
                  filter === "completed"
                    ? "bg-muted text-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Done ({completedTasks.length})
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: ASSIGNED TASKS */}
        {activeTab === "tasks" && (
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-semibold text-foreground text-sm">No tasks in this view!</p>
                <p className="text-xs text-muted-foreground">You are completely caught up.</p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isOverdue = !task.isDone && task.dueDate && task.dueDate < todayStr;
                const isDueToday = !task.isDone && task.dueDate && task.dueDate === todayStr;

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      task.isDone
                        ? "bg-muted/20 border-border/60 opacity-60"
                        : isOverdue
                        ? "bg-rose-500/5 border-rose-500/30 shadow-xs"
                        : "bg-card border-border hover:border-primary/40 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                        title={task.isDone ? "Reopen task" : "Mark completed"}
                      >
                        {task.isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold ${
                              task.isDone ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {task.title}
                          </span>
                          {getPriorityBadge(task.priority || "normal")}
                          {isOverdue && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-600 border border-rose-500/30">
                              OVERDUE
                            </span>
                          )}
                          {isDueToday && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30">
                              DUE TODAY
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        )}

                        {/* Associated Entities */}
                        <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground pt-0.5">
                          {task.relatedContact && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-primary" /> {task.relatedContact.firstName}{" "}
                              {task.relatedContact.lastName || ""}
                            </span>
                          )}
                          {task.relatedCompany && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-primary" /> {task.relatedCompany.name}
                            </span>
                          )}
                          {task.relatedDeal && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-primary" /> {task.relatedDeal.title}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      {task.dueDate && (
                        <div className="text-right text-[11px] font-mono">
                          <span className={isOverdue ? "text-rose-500 font-bold" : "text-muted-foreground"}>
                            Due {task.dueDate}
                          </span>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setSelectedTaskForNote(task);
                          setTaskNote("");
                        }}
                        className="text-[11px] h-7 px-2.5 gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> Add Note
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: MY DEALS */}
        {activeTab === "deals" && (
          <div className="space-y-3">
            {deals.length === 0 ? (
              <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl space-y-2">
                <DollarSign className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="font-semibold text-foreground text-sm">No active deals assigned</p>
                <p className="text-xs text-muted-foreground">
                  New incoming deals assigned to you will appear here.
                </p>
              </div>
            ) : (
              deals.map((deal) => (
                <div
                  key={deal.id}
                  className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{deal.title}</h3>
                      <span className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] font-mono uppercase">
                        Stage: {deal.stageId || "Active"}
                      </span>
                    </div>
                    {deal.company && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {deal.company.name}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold font-mono text-primary">
                      ${(deal.value || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      Expected: {deal.expectedCloseDate || "No date"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: ACTIVITY LOG */}
        {activeTab === "activity" && (
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Recent Desk Activity</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Audit trail of completed tasks, customer touches, and CRM updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No recent activity logged.</p>
              ) : (
                <div className="space-y-3 divide-y divide-border/60 text-xs">
                  {activities.map((act) => (
                    <div key={act.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground">{act.body}</p>
                        <p className="text-[10px] font-mono text-muted-foreground capitalize">
                          Type: {act.type} • Source: {act.source || "Rep Desk"}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                        {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Note Logging Dialog */}
      {selectedTaskForNote && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-border bg-card shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Log Update for: {selectedTaskForNote.title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Add follow-up notes or outcomes. This will be recorded on the CRM timeline.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveTaskNote} className="p-4 pt-2 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Follow-up Note</Label>
                <textarea
                  className="w-full h-24 p-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Spoke with client, requested updated quote by Friday..."
                  value={taskNote}
                  onChange={(e) => setTaskNote(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTaskForNote(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={noteLoading} className="text-xs">
                  {noteLoading ? "Saving..." : "Log Note"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-[10px] font-mono text-muted-foreground">
        Powered by {orgName} Work Engine • Secure Access
      </footer>
    </div>
  );
}
