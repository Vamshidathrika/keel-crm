"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Plus,
  RefreshCw,
  Shuffle,
  ArrowRightLeft,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  Briefcase,
  Flame,
  UserCheck,
  Inbox,
  Filter,
  CheckCircle2,
  Circle,
  Sliders,
  Send,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  WorkloadMember,
  UnassignedItem,
  dispatchRoundRobin,
  bulkReassignWork,
  assignWorkItem,
  updateUserCapacity,
  generateRepPortalToken,
} from "@/app/actions/team-allocation";
import { inviteUser, toggleUserStatus, updateUserRole } from "@/app/actions/team";
import { createTask, toggleTaskStatus } from "@/app/actions/tasks";

interface TeamClientProps {
  initialData: {
    members: WorkloadMember[];
    stats: {
      totalMembers: number;
      activeReps: number;
      totalOpenTasks: number;
      totalPipelineValue: number;
      unassignedCount: number;
      avgCapacityLoad: number;
    };
  };
  initialUnassigned: UnassignedItem[];
  contacts: any[];
  deals: any[];
  currentUser: any;
}

export default function TeamClient({
  initialData,
  initialUnassigned,
  contacts,
  deals,
  currentUser,
}: TeamClientProps) {
  const isAdminOrManager = currentUser?.role === "admin" || currentUser?.role === "manager";
  const [data, setData] = useState(initialData);
  const [unassigned, setUnassigned] = useState<UnassignedItem[]>(initialUnassigned);
  const [activeTab, setActiveTab] = useState<string>("workload");

  // Multi-select for unassigned pool
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<"all" | "deal" | "task" | "contact">("all");
  const [isDispatching, setIsDispatching] = useState(false);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "rep" as const, password: "" });
  const [inviteLoading, setInviteLoading] = useState(false);

  // Bulk Reassign modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState<{
    sourceUserId: string;
    targetUserId: string;
    reassignDeals: boolean;
    reassignTasks: boolean;
    reassignContacts: boolean;
  }>({
    sourceUserId: "",
    targetUserId: "",
    reassignDeals: true,
    reassignTasks: true,
    reassignContacts: true,
  });
  const [bulkLoading, setBulkLoading] = useState(false);

  // Quick Dispatch modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetMemberForAssign, setTargetMemberForAssign] = useState<WorkloadMember | null>(null);
  const [assignForm, setAssignForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    relatedContactId: "none",
    relatedDealId: "none",
    priority: "normal" as const,
  });
  const [assignLoading, setAssignLoading] = useState(false);

  // Capacity adjust modal
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [memberToAdjust, setMemberToAdjust] = useState<WorkloadMember | null>(null);
  const [capacityValue, setCapacityValue] = useState<number>(20);
  const [capacityLoading, setCapacityLoading] = useState(false);

  // Copied token tracker
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const activeRepsList = data.members.filter((m) => m.isActive && m.role === "rep");

  const filteredUnassigned = unassigned.filter((item) => {
    if (filterType === "all") return true;
    return item.type === filterType;
  });

  const handleSelectAll = () => {
    if (selectedItems.length === filteredUnassigned.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredUnassigned.map((i) => i.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 1-Click Round Robin Auto-Dispatch
  const handleAutoDispatch = async () => {
    const itemsToDispatch = unassigned.filter((u) => selectedItems.includes(u.id));
    if (itemsToDispatch.length === 0) {
      toast.error("Please select at least one item to dispatch");
      return;
    }
    const targetIds = activeRepsList.length > 0 ? activeRepsList.map((m) => m.id) : data.members.map((m) => m.id);
    if (targetIds.length === 0) {
      toast.error("No active team members available for dispatch");
      return;
    }

    setIsDispatching(true);
    try {
      await dispatchRoundRobin({
        items: itemsToDispatch.map((i) => ({ id: i.id, type: i.type })),
        targetUserIds: targetIds,
      });

      // Update state locally
      setUnassigned((prev) => prev.filter((i) => !selectedItems.includes(i.id)));
      setSelectedItems([]);
      toast.success(`Successfully dispatched ${itemsToDispatch.length} items across ${targetIds.length} team members!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch work");
    } finally {
      setIsDispatching(false);
    }
  };

  // Assign selected to specific user
  const handleAssignSelectedToUser = async (targetUserId: string) => {
    if (!targetUserId) return;
    const itemsToDispatch = unassigned.filter((u) => selectedItems.includes(u.id));
    if (itemsToDispatch.length === 0) {
      toast.error("Please select items to assign");
      return;
    }

    setIsDispatching(true);
    try {
      await dispatchRoundRobin({
        items: itemsToDispatch.map((i) => ({ id: i.id, type: i.type })),
        targetUserIds: [targetUserId],
      });

      const member = data.members.find((m) => m.id === targetUserId);
      setUnassigned((prev) => prev.filter((i) => !selectedItems.includes(i.id)));
      setSelectedItems([]);
      toast.success(`Assigned ${itemsToDispatch.length} items to ${member?.name || "team member"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign items");
    } finally {
      setIsDispatching(false);
    }
  };

  // Copy portal link
  const handleCopyPortalLink = (portalUrl: string | null) => {
    if (!portalUrl) return;
    const fullUrl = `${window.location.origin}${portalUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(portalUrl);
    toast.success("Rep Work Portal URL copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 3000);
  };

  // Submit Invite
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email || !inviteForm.password) {
      toast.error("Please complete all required fields");
      return;
    }
    setInviteLoading(true);
    try {
      await inviteUser({
        name: inviteForm.name,
        email: inviteForm.email,
        role: inviteForm.role,
        passwordHash: inviteForm.password,
      });
      toast.success(`Invited ${inviteForm.name} to the team!`);
      setShowInviteModal(false);
      setInviteForm({ name: "", email: "", role: "rep", password: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to invite member");
    } finally {
      setInviteLoading(false);
    }
  };

  // Submit Bulk Reassign
  const handleBulkReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.sourceUserId || !bulkForm.targetUserId) {
      toast.error("Select both source and target team members");
      return;
    }
    setBulkLoading(true);
    try {
      const res = await bulkReassignWork(bulkForm);
      toast.success(`Successfully reallocated ${res.count} work items!`);
      setShowBulkModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to transfer work");
    } finally {
      setBulkLoading(false);
    }
  };

  // Submit Quick Task Allocation
  const handleCreateTaskForMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.title.trim() || !targetMemberForAssign) return;

    setAssignLoading(true);
    try {
      await createTask({
        title: assignForm.title,
        description: assignForm.description,
        dueDate: assignForm.dueDate || undefined,
        assigneeId: targetMemberForAssign.id,
        relatedContactId: assignForm.relatedContactId !== "none" ? assignForm.relatedContactId : undefined,
        relatedDealId: assignForm.relatedDealId !== "none" ? assignForm.relatedDealId : undefined,
      });

      toast.success(`Work assigned to ${targetMemberForAssign.name}`);
      setShowAssignModal(false);
      setAssignForm({
        title: "",
        description: "",
        dueDate: "",
        relatedContactId: "none",
        relatedDealId: "none",
        priority: "normal",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to assign task");
    } finally {
      setAssignLoading(false);
    }
  };

  // Submit Capacity Change
  const handleUpdateCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToAdjust) return;
    setCapacityLoading(true);
    try {
      await updateUserCapacity(memberToAdjust.id, Number(capacityValue));
      toast.success(`Max capacity for ${memberToAdjust.name} updated to ${capacityValue}`);
      setShowCapacityModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update capacity");
    } finally {
      setCapacityLoading(false);
    }
  };

  // Status color helper
  const getCapacityBadge = (status: "low" | "optimal" | "high" | "overloaded", percent: number) => {
    switch (status) {
      case "low":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            {percent}% Capacity (Low Load)
          </span>
        );
      case "optimal":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
            {percent}% Capacity (Optimal)
          </span>
        );
      case "high":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            {percent}% Capacity (High Load)
          </span>
        );
      case "overloaded":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {percent}% OVERLOADED
          </span>
        );
    }
  };

  const getCapacityProgressBar = (percent: number, status: string) => {
    let colorClass = "bg-primary";
    if (status === "low") colorClass = "bg-emerald-500";
    else if (status === "optimal") colorClass = "bg-blue-500";
    else if (status === "high") colorClass = "bg-amber-500";
    else if (status === "overloaded") colorClass = "bg-rose-500 animate-pulse";

    return (
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/40">
        <div
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    );
  };

  // Find logged-in user in roster
  const currentUserMember = data.members.find((m) => m.id === currentUser?.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" /> Sales Force & Workload Allocation Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time bandwidth governance, autonomous round-robin dispatch, rep portal telemetry, and multi-tier queue rebalancing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrManager && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkModal(true)}
                className="text-xs gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Rebalance Execution Queue
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoDispatch}
                disabled={isDispatching}
                className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Shuffle className={`w-3.5 h-3.5 ${isDispatching ? "animate-spin" : ""}`} />
                Autonomous Round-Robin
              </Button>
              <Button
                size="sm"
                onClick={() => setShowInviteModal(true)}
                className="text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Invite Member
              </Button>
            </>
          )}
          {currentUserMember?.portalUrl && (
            <Link
              href={currentUserMember.portalUrl}
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" /> My Rep Desk
            </Link>
          )}
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border border-border/80 bg-card p-3 shadow-xs">
          <p className="text-[10px] font-mono uppercase text-muted-foreground">Team Members</p>
          <p className="text-xl font-bold font-mono mt-1 text-foreground">{data.stats.totalMembers}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{data.stats.activeReps} Active Reps</p>
        </Card>

        <Card className="border border-border/80 bg-card p-3 shadow-xs">
          <p className="text-[10px] font-mono uppercase text-muted-foreground">Open Work Items</p>
          <p className="text-xl font-bold font-mono mt-1 text-foreground">{data.stats.totalOpenTasks}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Tasks in flight</p>
        </Card>

        <Card className="border border-border/80 bg-card p-3 shadow-xs">
          <p className="text-[10px] font-mono uppercase text-muted-foreground">Pipeline in Play</p>
          <p className="text-xl font-bold font-mono mt-1 text-foreground">
            ${(data.stats.totalPipelineValue || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Active deals</p>
        </Card>

        <Card className="border border-border/80 bg-card p-3 shadow-xs">
          <p className="text-[10px] font-mono uppercase text-muted-foreground">Unassigned Pool</p>
          <p className="text-xl font-bold font-mono mt-1 text-amber-500 flex items-center gap-1">
            <Inbox className="w-4 h-4" /> {unassigned.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Pending allocation</p>
        </Card>

        <Card className="border border-border/80 bg-card p-3 shadow-xs">
          <p className="text-[10px] font-mono uppercase text-muted-foreground">Avg Rep Load</p>
          <p className="text-xl font-bold font-mono mt-1 text-foreground">{data.stats.avgCapacityLoad}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Capacity utilization</p>
        </Card>

        <Card className="border border-border/80 bg-card p-3 shadow-xs">
          <p className="text-[10px] font-mono uppercase text-muted-foreground">Dispatch Mode</p>
          <p className="text-sm font-bold font-mono mt-1 text-primary flex items-center gap-1">
            <Shuffle className="w-3.5 h-3.5" /> Round-Robin
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Auto-load balance</p>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border/80 rounded-lg">
          <TabsTrigger value="workload" className="text-xs gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5" /> Workload &amp; Capacity Matrix
          </TabsTrigger>
          <TabsTrigger value="dispatcher" className="text-xs gap-1.5 font-medium">
            <Shuffle className="w-3.5 h-3.5" /> Work Dispatcher
            {unassigned.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-amber-500/20 text-amber-500 font-bold">
                {unassigned.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="roster" className="text-xs gap-1.5 font-medium">
            <UserCheck className="w-3.5 h-3.5" /> Team Roster &amp; Access
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: WORKLOAD & CAPACITY MATRIX */}
        <TabsContent value="workload" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Sales Rep Capacity &amp; Live Allocations</h2>
              <p className="text-xs text-muted-foreground">
                Real-time active pipeline, task volume, and overdue metrics per team member.
              </p>
            </div>
            {isAdminOrManager && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (unassigned.length === 0) {
                    toast.info("No unassigned items currently waiting.");
                    return;
                  }
                  setActiveTab("dispatcher");
                }}
                className="text-xs gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5 text-primary" /> Auto-Balance Unassigned ({unassigned.length})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.members.map((member) => (
              <Card
                key={member.id}
                className="border border-border/90 bg-card hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-bold text-foreground">{member.name}</CardTitle>
                        <span className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] font-mono uppercase">
                          {member.role}
                        </span>
                      </div>
                      <CardDescription className="text-xs font-mono text-muted-foreground mt-0.5">
                        {member.email}
                      </CardDescription>
                    </div>
                    {getCapacityBadge(member.metrics.loadStatus, member.metrics.capacityLoadPercent)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pb-4">
                  {/* Capacity Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                      <span>Capacity Utilization</span>
                      <span>
                        {member.metrics.openTasksCount + member.metrics.activeDealsCount} / {member.maxCapacity} Items
                      </span>
                    </div>
                    {getCapacityProgressBar(member.metrics.capacityLoadPercent, member.metrics.loadStatus)}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-lg border border-border/50 text-center">
                    <div>
                      <p className="text-[9px] font-mono uppercase text-muted-foreground">Deals</p>
                      <p className="text-sm font-bold font-mono text-foreground">{member.metrics.activeDealsCount}</p>
                      <p className="text-[9px] text-muted-foreground">
                        ${(member.metrics.pipelineValue || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono uppercase text-muted-foreground">Open Tasks</p>
                      <p className="text-sm font-bold font-mono text-foreground">{member.metrics.openTasksCount}</p>
                      <p className="text-[9px] text-emerald-600 font-mono">
                        {member.metrics.completedTasksCount} done
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono uppercase text-muted-foreground">Overdue</p>
                      <p
                        className={`text-sm font-bold font-mono ${
                          member.metrics.overdueTasksCount > 0 ? "text-rose-500" : "text-muted-foreground"
                        }`}
                      >
                        {member.metrics.overdueTasksCount}
                      </p>
                      <p className="text-[9px] text-muted-foreground">needs action</p>
                    </div>
                  </div>

                  {/* Rep Actions Strip */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    {/* Copy Rep Portal Link */}
                    {member.portalUrl ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleCopyPortalLink(member.portalUrl)}
                        className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                        title="Copy direct Rep Portal magic link"
                      >
                        {copiedToken === member.portalUrl ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedToken === member.portalUrl ? "Link Copied!" : "Portal Link"}</span>
                      </Button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-1.5">
                      {isAdminOrManager && (
                        <>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setMemberToAdjust(member);
                              setCapacityValue(member.maxCapacity);
                              setShowCapacityModal(true);
                            }}
                            className="text-[10px] h-7 px-2"
                            title="Adjust max capacity threshold"
                          >
                            <Sliders className="w-3 h-3 mr-1" /> Max Cap
                          </Button>
                          <Button
                            size="xs"
                            onClick={() => {
                              setTargetMemberForAssign(member);
                              setShowAssignModal(true);
                            }}
                            className="text-[10px] h-7 px-2 gap-1"
                          >
                            <Plus className="w-3 h-3" /> Assign Work
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: WORK DISPATCHER POOL */}
        <TabsContent value="dispatcher" className="space-y-4">
          <Card className="border border-border bg-card">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-primary" /> Unassigned Work Pool
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Incoming leads, unassigned pipeline deals, and pending tasks awaiting allocation.
                </CardDescription>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={filterType}
                  onValueChange={(val: any) => setFilterType(val)}
                >
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="Filter Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="deal">Deals</SelectItem>
                    <SelectItem value="task">Tasks</SelectItem>
                    <SelectItem value="contact">Contacts</SelectItem>
                  </SelectContent>
                </Select>

                {isAdminOrManager && selectedItems.length > 0 && (
                  <>
                    <Button
                      size="sm"
                      onClick={handleAutoDispatch}
                      disabled={isDispatching}
                      className="h-8 text-xs gap-1.5 bg-primary font-semibold"
                    >
                      <Shuffle className="w-3.5 h-3.5" /> Round-Robin ({selectedItems.length})
                    </Button>

                    <Select onValueChange={(val: any) => { if (val) handleAssignSelectedToUser(val); }}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Assign To Rep ▾" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.members
                          .filter((m) => m.isActive)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-xs">
                              {m.name} ({m.role})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {filteredUnassigned.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs space-y-2 border border-dashed border-border rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-foreground">All work is currently assigned!</p>
                  <p className="text-[11px]">No unassigned deals, tasks, or incoming leads in queue.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-card overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              selectedItems.length === filteredUnassigned.length &&
                              filteredUnassigned.length > 0
                            }
                            onChange={handleSelectAll}
                            className="rounded border-border"
                          />
                        </th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Item Title / Detail</th>
                        <th className="px-4 py-3">Value / Priority</th>
                        <th className="px-4 py-3">Created Date</th>
                        <th className="px-4 py-3 text-right">Quick Dispatch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredUnassigned.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-muted/10 transition-colors ${
                            selectedItems.includes(item.id) ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={() => toggleSelectItem(item.id)}
                              className="rounded border-border"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold ${
                                item.type === "deal"
                                  ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                  : item.type === "task"
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">
                            <div>{item.title}</div>
                            {item.subtitle && (
                              <div className="text-[11px] text-muted-foreground font-normal">
                                {item.subtitle}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {item.value ? (
                              <span className="font-bold text-foreground">
                                ${(item.value || 0).toLocaleString()}
                              </span>
                            ) : item.priority ? (
                              <span className="capitalize">{item.priority}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isAdminOrManager && (
                              <Select
                                onValueChange={async (userId: any) => {
                                  if (!userId) return;
                                  try {
                                    await assignWorkItem({
                                      entityType: item.type,
                                      entityId: item.id,
                                      targetUserId: userId as string,
                                    });
                                    setUnassigned((prev) => prev.filter((i) => i.id !== item.id));
                                    toast.success("Item assigned successfully");
                                  } catch (err: any) {
                                    toast.error(err.message || "Failed to assign item");
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[140px] h-7 text-[11px] inline-flex">
                                  <SelectValue placeholder="Assign rep..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {data.members
                                    .filter((m) => m.isActive)
                                    .map((m) => (
                                      <SelectItem key={m.id} value={m.id} className="text-xs">
                                        {m.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: TEAM ROSTER & ACCESS */}
        <TabsContent value="roster" className="space-y-4">
          <Card className="border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold">Personnel Directory &amp; Roles</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Manage active credentials, security roles, and Portal access tokens.
                </CardDescription>
              </div>
              {isAdminOrManager && (
                <Button onClick={() => setShowInviteModal(true)} size="sm" className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Invite Member
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-card overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Team Member</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Max Cap</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Rep Portal</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.members.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono capitalize">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{u.maxCapacity} items</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                              u.isActive
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {u.isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.portalUrl ? (
                            <div className="flex items-center gap-2">
                              <Link
                                href={u.portalUrl}
                                target="_blank"
                                className="text-primary hover:underline flex items-center gap-1 font-mono text-[11px]"
                              >
                                View Portal <ExternalLink className="w-3 h-3" />
                              </Link>
                              <button
                                onClick={() => handleCopyPortalLink(u.portalUrl)}
                                className="text-muted-foreground hover:text-foreground p-1"
                                title="Copy portal link"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">No token</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {currentUser.id !== u.id && isAdminOrManager && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={async () => {
                                try {
                                  await toggleUserStatus(u.id, !u.isActive);
                                  toast.success(`User status updated to ${!u.isActive ? "Active" : "Deactivated"}`);
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to toggle status");
                                }
                              }}
                              className="h-7 text-[10px] px-2"
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: INVITE MEMBER */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Invite Team Member
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new sales representative or manager to the organization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Full Name</Label>
              <Input
                placeholder="e.g. Maya Lin"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email Address</Label>
              <Input
                type="email"
                placeholder="maya@company.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Access Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(val: any) => setInviteForm({ ...inviteForm, role: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rep">Sales Rep (My Work &amp; Assigned Records)</SelectItem>
                  <SelectItem value="manager">Manager (Workload Dispatch &amp; Team View)</SelectItem>
                  {currentUser?.role === "admin" && (
                    <SelectItem value="admin">Administrator (Full Access)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Initial Password</Label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={inviteForm.password}
                onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInviteModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={inviteLoading}>
                {inviteLoading ? "Sending..." : "Create Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: BULK QUEUE REASSIGN */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary" /> Bulk Work Queue Reassignment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Transfer deals, open tasks, and contacts from one representative to another in 1-click.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkReassignSubmit} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">From (Source Team Member)</Label>
              <Select
                value={bulkForm.sourceUserId || ""}
                onValueChange={(val: any) => setBulkForm({ ...bulkForm, sourceUserId: val || "" })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select source rep..." />
                </SelectTrigger>
                <SelectContent>
                  {data.members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.metrics.openTasksCount} tasks, {m.metrics.activeDealsCount} deals)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">To (Target Team Member)</Label>
              <Select
                value={bulkForm.targetUserId || ""}
                onValueChange={(val: any) => setBulkForm({ ...bulkForm, targetUserId: val || "" })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select destination rep..." />
                </SelectTrigger>
                <SelectContent>
                  {data.members
                    .filter((m) => m.id !== bulkForm.sourceUserId && m.isActive)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.metrics.capacityLoadPercent}% Load)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 space-y-2 border-t border-border">
              <p className="text-[11px] font-semibold text-foreground">Include in Transfer:</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkForm.reassignTasks}
                    onChange={(e) => setBulkForm({ ...bulkForm, reassignTasks: e.target.checked })}
                    className="rounded"
                  />
                  <span>Open Tasks</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkForm.reassignDeals}
                    onChange={(e) => setBulkForm({ ...bulkForm, reassignDeals: e.target.checked })}
                    className="rounded"
                  />
                  <span>Active Deals</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkForm.reassignContacts}
                    onChange={(e) => setBulkForm({ ...bulkForm, reassignContacts: e.target.checked })}
                    className="rounded"
                  />
                  <span>Contacts</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBulkModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={bulkLoading}>
                {bulkLoading ? "Transferring..." : "Execute Handover"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: QUICK ASSIGN WORK TO MEMBER */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Assign Work to {targetMemberForAssign?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create and dispatch a prioritized task directly to this representative's Desk.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTaskForMember} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Task Title</Label>
              <Input
                placeholder="e.g. Schedule product demo & follow-up"
                value={assignForm.title}
                onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instructions / Notes</Label>
              <Input
                placeholder="Key context or action item..."
                value={assignForm.description}
                onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={assignForm.dueDate}
                  onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Related Deal (Optional)</Label>
                <Select
                  value={assignForm.relatedDealId || "none"}
                  onValueChange={(val: any) => setAssignForm({ ...assignForm, relatedDealId: val || "" })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select deal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={assignLoading}>
                {assignLoading ? "Dispatching..." : "Assign to Desk"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: CAPACITY ADJUSTER */}
      <Dialog open={showCapacityModal} onOpenChange={setShowCapacityModal}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Max Capacity Limit</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set the workload threshold for {memberToAdjust?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCapacity} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Concurrent Items (Deals + Tasks)</Label>
              <Input
                type="number"
                min={5}
                max={100}
                value={capacityValue}
                onChange={(e) => setCapacityValue(Number(e.target.value))}
                required
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Used to calculate Load % and Overload warning status.
              </p>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCapacityModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={capacityLoading}>
                {capacityLoading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
