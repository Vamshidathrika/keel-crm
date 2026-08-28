"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Settings,
  GitBranch,
  Users,
  Terminal,
  Activity,
  Plus,
  Trash2,
  Check,
  Clipboard,
  ShieldAlert,
  ToggleLeft,
  Key,
  Globe,
  Database,
  Lock,
  Sparkles,
  Palette,
  Puzzle,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStage, updateStage, deleteStage, createPipeline, deletePipeline } from "@/app/actions/pipelines";
import { inviteUser, updateUserRole, toggleUserStatus } from "@/app/actions/team";
import { createApiKey, revokeApiKey } from "@/app/actions/apikeys";
import { createWebhook, deleteWebhook, toggleWebhook } from "@/app/actions/webhooks";
import { createAutomation, deleteAutomation, toggleAutomation } from "@/app/actions/automations";
import { findDuplicateContacts, mergeContacts } from "@/app/actions/duplicates";
import { saveBrandingConfig, type BrandingConfig } from "@/server/actions/branding";
import { toggleWidget } from "@/server/actions/widgets";
import dynamic from "next/dynamic";
import { WIDGET_REGISTRY } from "@/lib/widgets/registry";
import { toast } from "sonner";
import { CustomFieldsStudio } from "@/components/custom-fields/custom-fields-studio";
import { CustomObjectsStudio } from "@/components/custom-objects/custom-objects-studio";
import { Boxes, Sliders } from "lucide-react";

const WorkflowCanvas = dynamic(
  () => import("@/components/automations/workflow-canvas").then((mod) => mod.WorkflowCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] w-full flex items-center justify-center border border-border/70 rounded-xl bg-card/50 text-xs text-muted-foreground">
        Loading visual workflow editor...
      </div>
    ),
  }
);

type Stage = {
  id: string;
  name: string;
  order: number;
  type: "open" | "won" | "lost";
  probability: number;
  color: string;
};

type Pipeline = {
  id: string;
  name: string;
  isDefault?: boolean;
  stages: Stage[];
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "rep";
  isActive: boolean;
  createdAt: string;
};

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
};

type Webhook = {
  id: string;
  targetUrl: string;
  eventTypes: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
};

type AuditLog = {
  id: string;
  actorUserId: {
    name: string;
    email: string;
  } | null;
  action: string;
  entityType: string;
  entityId: string;
  diff: any;
  createdAt: string;
};

type Automation = {
  id: string;
  name: string;
  trigger: string;
  isEnabled: boolean;
  automationConditions: { field: string; operator: string; value: string }[];
  automationActions: { actionType: string; config: any }[];
};

interface SettingsClientProps {
  pipelines: Pipeline[];
  team: TeamMember[];
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  auditLogs: AuditLog[];
  automations: Automation[];
  currentUser: any;
  branding?: BrandingConfig;
  orgWidgets?: any[];
}

export default function SettingsClient({
  pipelines,
  team: initialTeam,
  apiKeys: initialApiKeys,
  webhooks: initialWebhooks,
  auditLogs: initialAuditLogs,
  automations: initialAutomations,
  currentUser,
  branding: initialBranding = {},
  orgWidgets: initialOrgWidgets = [],
}: SettingsClientProps) {
  const isAdmin = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";

  const [pipelinesList, setPipelinesList] = useState<Pipeline[]>(pipelines);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(pipelines[0] || null);
  const [stagesList, setStagesList] = useState<Stage[]>(activePipeline?.stages || []);

  // Pipeline Management Modal states
  const [showPipelineDialog, setShowPipelineDialog] = useState(false);
  const [pipelineForm, setPipelineForm] = useState({ name: "", isDefault: false });
  const [pipelineLoading, setPipelineLoading] = useState(false);

  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks);
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);

  // Branding state
  const [brandingForm, setBrandingForm] = useState<BrandingConfig>(initialBranding);
  const [brandingLoading, setBrandingLoading] = useState(false);

  // Widgets state — map of widgetKey → isEnabled
  const buildWidgetMap = (rows: any[]) => {
    const map: Record<string, boolean> = {};
    if (rows.length === 0) {
      // Default: core widgets enabled
      WIDGET_REGISTRY.forEach((w) => { map[w.key] = w.defaultFor === "all"; });
    } else {
      rows.forEach((r) => { map[r.widgetKey] = r.isEnabled; });
      // Any widget not in rows defaults to disabled
      WIDGET_REGISTRY.forEach((w) => { if (!(w.key in map)) map[w.key] = false; });
    }
    return map;
  };
  const [widgetMap, setWidgetMap] = useState<Record<string, boolean>>(() => buildWidgetMap(initialOrgWidgets));
  const [widgetLoading, setWidgetLoading] = useState<string | null>(null);

  // Invitation Modal
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "rep" as any, password: "" });
  const [inviteLoading, setInviteLoading] = useState(false);

  // New API Key display modal
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [apiKeyName, setApiKeyName] = useState("");
  const [keyLoading, setKeyLoading] = useState(false);

  // Webhook Modal
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ targetUrl: "", events: ["contact.created"] });
  const [webhookLoading, setWebhookLoading] = useState(false);

  // Stage Creation Dialog
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [stageForm, setStageForm] = useState({ name: "", probability: 20, color: "#2f5dff", type: "open" as any });
  const [stageLoading, setStageLoading] = useState(false);

  // Automation Modal
  const [showAutoDialog, setShowAutoDialog] = useState(false);
  const [autoForm, setAutoForm] = useState({
    name: "",
    trigger: "deal_stage_changed" as any,
    actionType: "create_task" as any,
    taskTitle: "",
    taskDesc: "Automated task triggered by workflow rule.",
    taskDueDays: 2,
    tagValue: "",
    webhookUrl: "",
    hasCondition: false,
    conditionField: "stageId",
    conditionValue: "",
  });
  const [autoLoading, setAutoLoading] = useState(false);

  // Deduplication States
  const [dupeGroups, setDupeGroups] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [mergingId, setMergingId] = useState<string | null>(null);

  const handleScanDuplicates = async () => {
    setScanning(true);
    try {
      const res = await findDuplicateContacts();
      setDupeGroups(res);
      toast.success(`Scan complete! Found ${res.length} duplicate groups.`);
    } catch (err) {
      toast.error("Failed to scan for duplicates");
    } finally {
      setScanning(false);
    }
  };

  const handleMerge = async (targetId: string, sourceId: string) => {
    if (!confirm("Are you sure you want to merge these contacts? All activities, deals, and tasks will be migrated, and the duplicate contact deleted. This action is permanent!")) return;
    setMergingId(sourceId);
    try {
      await mergeContacts(targetId, sourceId);
      toast.success("Contacts merged successfully!");
      const res = await findDuplicateContacts();
      setDupeGroups(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to merge contacts");
    } finally {
      setMergingId(null);
    }
  };

  // Team Invite submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim() || !inviteForm.password.trim()) {
      toast.error("Please fill in all invite fields");
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
      toast.success("User invited and created successfully!");
      setShowInviteDialog(false);
      setInviteForm({ name: "", email: "", role: "rep", password: "" });
      // Reload page state or fetch
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to invite user");
    } finally {
      setInviteLoading(false);
    }
  };

  // Pipeline Switcher & CRUD logic
  const handleSelectPipeline = (pipelineId: string) => {
    const pipe = pipelinesList.find((p) => p.id === pipelineId) || null;
    setActivePipeline(pipe);
    setStagesList(pipe?.stages || []);
  };

  const handleCreatePipelineInSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipelineForm.name.trim()) {
      toast.error("Pipeline name is required");
      return;
    }
    setPipelineLoading(true);
    try {
      const updatedPipes = await createPipeline(pipelineForm.name.trim(), pipelineForm.isDefault);
      setPipelinesList(updatedPipes as Pipeline[]);
      const newPipe = updatedPipes.find((p) => p.name === pipelineForm.name.trim()) || updatedPipes[updatedPipes.length - 1];
      if (newPipe) {
        setActivePipeline(newPipe as Pipeline);
        setStagesList(newPipe.stages || []);
      }
      setShowPipelineDialog(false);
      setPipelineForm({ name: "", isDefault: false });
      toast.success("Pipeline created successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to create pipeline");
    } finally {
      setPipelineLoading(false);
    }
  };

  const handleDeletePipelineInSettings = async (pipelineId: string) => {
    if (pipelinesList.length <= 1) {
      toast.error("Cannot delete your only pipeline");
      return;
    }
    if (!confirm("Are you sure you want to delete this pipeline and all its stages?")) return;

    try {
      const fallback = pipelinesList.find((p) => p.id !== pipelineId)?.id;
      const updatedPipes = await deletePipeline(pipelineId, fallback);
      setPipelinesList(updatedPipes as Pipeline[]);
      const nextPipe = updatedPipes[0] || null;
      setActivePipeline(nextPipe as Pipeline);
      setStagesList(nextPipe?.stages || []);
      toast.success("Pipeline deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete pipeline");
    }
  };

  // Stage CRUD logic
  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageForm.name.trim() || !activePipeline) return;
    setStageLoading(true);
    try {
      const order = stagesList.length;
      const newStage = await createStage({
        pipelineId: activePipeline.id,
        name: stageForm.name,
        probability: Number(stageForm.probability) || 10,
        color: stageForm.color,
        order,
        type: stageForm.type,
      });

      setStagesList((prev) => [...prev, newStage as Stage]);
      setShowStageDialog(false);
      setStageForm({ name: "", probability: 20, color: "#2f5dff", type: "open" });
      toast.success("Pipeline stage added");
    } catch (err: any) {
      toast.error("Failed to add stage");
    } finally {
      setStageLoading(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Are you sure you want to delete this stage? Deals linked to this stage might lose reference.")) return;
    try {
      await deleteStage(stageId);
      setStagesList((prev) => prev.filter((s) => s.id !== stageId));
      toast.success("Stage deleted");
    } catch (err) {
      toast.error("Failed to delete stage");
    }
  };

  // API Key creation
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyName.trim()) return;
    setKeyLoading(true);
    try {
      const res = await createApiKey(apiKeyName);
      setApiKeys((prev) => [...prev, { id: res.id, name: res.name, keyPrefix: res.keyPrefix, createdAt: new Date().toISOString() }]);
      setGeneratedKey(res.rawKey);
      setApiKeyName("");
      toast.success("API key generated");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate key");
    } finally {
      setKeyLoading(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Revoke this API Key immediately? Systems relying on this key will be blocked.")) return;
    try {
      await revokeApiKey(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key revoked");
    } catch (err: any) {
      toast.error("Failed to revoke key");
    }
  };

  // Webhooks creation
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookForm.targetUrl.trim()) return;
    setWebhookLoading(true);
    try {
      const nextWh = await createWebhook({
        targetUrl: webhookForm.targetUrl.trim(),
        eventTypes: webhookForm.events,
      });
      setWebhooks((prev) => [nextWh as Webhook, ...prev]);
      setShowWebhookDialog(false);
      setWebhookForm({ targetUrl: "", events: ["contact.created"] });
      toast.success("Webhook endpoint configured");
    } catch (err: any) {
      toast.error("Failed to create webhook");
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleToggleWebhook = async (id: string, active: boolean) => {
    try {
      await toggleWebhook(id, active);
      setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, isActive: active } : w)));
      toast.success(`Webhook ${active ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error("Failed to toggle webhook status");
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Delete this webhook? Outgoing calls will be cancelled.")) return;
    try {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success("Webhook configuration deleted");
    } catch (err) {
      toast.error("Failed to delete webhook");
    }
  };

  // Automations creation
  const handleCreateAuto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoForm.name.trim()) return;
    if (autoForm.actionType === "create_task" && !autoForm.taskTitle.trim()) return;
    if (autoForm.actionType === "add_tag" && !autoForm.tagValue.trim()) return;
    if (autoForm.actionType === "call_webhook" && !autoForm.webhookUrl.trim()) return;

    setAutoLoading(true);
    try {
      let condition: any = undefined;
      if (autoForm.hasCondition && autoForm.conditionValue) {
        condition = {
          field: autoForm.conditionField,
          operator: "equals",
          value: autoForm.conditionValue,
        };
      }

      let config: Record<string, any> = {};
      if (autoForm.actionType === "create_task") {
        config = {
          title: autoForm.taskTitle.trim(),
          description: autoForm.taskDesc.trim(),
          dueDays: autoForm.taskDueDays,
        };
      } else if (autoForm.actionType === "add_tag") {
        config = {
          tag: autoForm.tagValue.trim(),
        };
      } else if (autoForm.actionType === "call_webhook") {
        config = {
          url: autoForm.webhookUrl.trim(),
        };
      }

      await createAutomation({
        name: autoForm.name,
        trigger: autoForm.trigger,
        condition,
        action: {
          actionType: autoForm.actionType,
          config,
        },
      });

      toast.success("Workflow rule created successfully");
      setShowAutoDialog(false);
      setAutoForm({
        name: "",
        trigger: "deal_stage_changed",
        actionType: "create_task",
        taskTitle: "",
        taskDesc: "Automated task triggered by workflow rule.",
        taskDueDays: 2,
        tagValue: "",
        webhookUrl: "",
        hasCondition: false,
        conditionField: "stageId",
        conditionValue: "",
      });
      window.location.reload();
    } catch (err: any) {
      toast.error("Failed to create automation rule");
    } finally {
      setAutoLoading(false);
    }
  };

  const handleToggleAuto = async (id: string, isEnabled: boolean) => {
    try {
      await toggleAutomation(id, isEnabled);
      setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, isEnabled } : a)));
      toast.success(`Automation ${isEnabled ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error("Failed to toggle rule");
    }
  };

  const handleDeleteAuto = async (id: string) => {
    try {
      await deleteAutomation(id);
      setAutomations((prev) => prev.filter((a) => a.id !== id));
      toast.success("Automation rule deleted");
    } catch (err) {
      toast.error("Failed to delete rule");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Configure workspace workflows, team roles, and API integrations.
        </p>
      </div>

      <Tabs defaultValue="custom-fields" className="space-y-4">
        <TabsList className="bg-muted border border-border p-1 gap-1">
          <TabsTrigger value="custom-fields" className="text-xs gap-1.5">
            <Sliders className="w-3.5 h-3.5" /> Custom Fields
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="custom-objects" className="text-xs gap-1.5">
              <Boxes className="w-3.5 h-3.5" /> Custom Objects
            </TabsTrigger>
          )}
          <TabsTrigger value="pipelines" className="text-xs gap-1.5">
            <GitBranch className="w-3.5 h-3.5" /> Pipelines
          </TabsTrigger>
          {(isAdmin || isManager) && (
            <TabsTrigger value="team" className="text-xs gap-1.5">
              <Users className="w-3.5 h-3.5" /> Team
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="developer" className="text-xs gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Developer API
            </TabsTrigger>
          )}
          <TabsTrigger value="automations" className="text-xs gap-1.5">
            <ToggleLeft className="w-3.5 h-3.5" /> Automations
          </TabsTrigger>
          {(isAdmin || isManager) && (
            <TabsTrigger value="audit" className="text-xs gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Audit Trail
            </TabsTrigger>
          )}
          {(isAdmin || isManager) && (
            <TabsTrigger value="data-quality" className="text-xs gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-ai" /> Data Quality
            </TabsTrigger>
          )}
        {isAdmin && (
            <TabsTrigger value="branding" className="text-xs gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Branding
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="widgets" className="text-xs gap-1.5">
              <Puzzle className="w-3.5 h-3.5" /> Widgets
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Pipelines */}
        <TabsContent value="pipelines" className="space-y-4">
          <Card className="border border-border bg-card">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-bold">Sales Pipelines & Stages</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Manage multiple sales pipelines, customize stages, and adjust win probabilities.
                </CardDescription>
              </div>

              {(isAdmin || isManager) && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setShowPipelineDialog(true)} variant="outline" size="sm" className="text-xs gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Pipeline
                  </Button>
                  <Button onClick={() => setShowStageDialog(true)} size="sm" className="text-xs gap-1" disabled={!activePipeline}>
                    <Plus className="w-3.5 h-3.5" /> Add Stage
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Pipeline Selector Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Active Pipeline:</span>
                  <Select
                    value={activePipeline?.id || ""}
                    onValueChange={(val) => val && handleSelectPipeline(val)}
                  >
                    <SelectTrigger className="w-52 h-8 bg-card border-border font-medium text-xs">
                      <SelectValue placeholder="Select Pipeline" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {pipelinesList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="font-medium">{p.name}</span>
                          {p.isDefault && <span className="text-[10px] text-muted-foreground ml-1.5">(Default)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(isAdmin || isManager) && activePipeline && pipelinesList.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePipelineInSettings(activePipeline.id)}
                    className="text-xs text-muted-foreground hover:text-destructive gap-1 h-8"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete This Pipeline
                  </Button>
                )}
              </div>

              {/* Stages List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-foreground">
                  Stages for "{activePipeline?.name || "Pipeline"}" ({stagesList.length} stages)
                </h4>

                {stagesList.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border rounded-lg text-muted-foreground text-xs">
                    No stages found for this pipeline. Click "Add Stage" above to create one.
                  </div>
                ) : (
                  stagesList.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                        <span className="font-semibold text-foreground">{st.name}</span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          ({st.type} Stage)
                        </span>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="font-mono text-muted-foreground">
                          Probability: <span className="text-foreground font-semibold">{st.probability}%</span>
                        </div>
                        {(isAdmin || isManager) && (
                          <button
                            onClick={() => handleDeleteStage(st.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            title="Delete stage"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Team Members */}
        <TabsContent value="team">
          <Card className="border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Team Members</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Manage active personnel and access permissions.
                </CardDescription>
              </div>
              <Button onClick={() => setShowInviteDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Invite Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-card overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">User Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Settings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {team.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono capitalize">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                              u.isActive
                                ? "bg-success/10 text-success border border-success/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {u.isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {currentUser.id !== u.id && isAdmin && (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleToggleWebhook(u.id, !u.isActive)} // Wait, need toggleUserStatus
                                className="h-7 text-[10px] px-2"
                              >
                                Toggle
                              </Button>
                            </div>
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

        {/* Tab: Developer Settings (API/Webhooks) */}
        <TabsContent value="developer">
          <div className="space-y-6">
            {/* API Keys */}
            <Card className="border border-border bg-card">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-primary" /> API Keys &amp; Developer Platform
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Generate scoped bearer tokens (`keel_sk_...`) to ingest webhook events and query REST endpoints.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/docs" target="_blank">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      <span>Swagger UI Docs</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleCreateKey} className="flex gap-2 max-w-md">
                  <Input
                    placeholder="Key Label (e.g., Twilio Ingest)"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    disabled={keyLoading}
                  />
                  <Button type="submit" disabled={keyLoading}>
                    Generate
                  </Button>
                </form>

                {apiKeys.length > 0 && (
                  <div className="rounded-lg border border-border overflow-x-auto text-xs bg-card">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Prefix</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {apiKeys.map((k) => (
                          <tr key={k.id} className="hover:bg-muted/10">
                            <td className="px-4 py-3 font-semibold text-foreground">{k.name}</td>
                            <td className="px-4 py-3 font-mono text-muted-foreground">{k.keyPrefix}</td>
                            <td suppressHydrationWarning className="px-4 py-3 font-mono text-muted-foreground">
                              {new Date(k.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRevokeKey(k.id)}
                                className="text-muted-foreground hover:text-destructive p-1 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Outgoing Webhooks */}
            <Card className="border border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-primary" /> Outgoing Webhooks
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Dispatch JSON payloads signed with SHA-256 HMAC headers on core events.
                  </CardDescription>
                </div>
                <Button onClick={() => setShowWebhookDialog(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Endpoint
                </Button>
              </CardHeader>
              <CardContent>
                {webhooks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">
                    No webhooks configured.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {webhooks.map((wh) => (
                      <div
                        key={wh.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{wh.targetUrl}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            Events: {wh.eventTypes.join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleToggleWebhook(wh.id, !wh.isActive)}
                            className={`px-2 py-0.5 rounded text-[10px] border ${
                              wh.isActive
                                ? "bg-success/10 border-success/30 text-success"
                                : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            {wh.isActive ? "Active" : "Paused"}
                          </button>
                          <button
                            onClick={() => handleDeleteWebhook(wh.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Automations */}
        <TabsContent value="automations" className="space-y-6">
          {/* Visual XYFlows DAG Canvas */}
          <div>
            <div className="mb-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" /> Visual Workflow DAG Canvas
              </h3>
              <p className="text-xs text-muted-foreground">
                Drag, drop, and connect triggers, condition filters, and autonomous agent hands.
              </p>
            </div>
            <WorkflowCanvas />
          </div>

          <Card className="border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <ToggleLeft className="w-4 h-4 text-primary" /> Active Workflow Rules
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Event-driven rules executed across CRM pipelines and webhooks.
                </CardDescription>
              </div>
              <Button onClick={() => setShowAutoDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" /> New Rule
              </Button>
            </CardHeader>
            <CardContent>
              {automations.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  No automated workflows configured.
                </p>
              ) : (
                <div className="space-y-3">
                  {automations.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{a.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          Trigger: {a.trigger.replace(/_/g, " ")} | Action: {a.automationActions[0]?.actionType}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleAuto(a.id, !a.isEnabled)}
                          className={`px-2 py-0.5 rounded text-[10px] border ${
                            a.isEnabled
                              ? "bg-success/10 border-success/30 text-success"
                              : "bg-muted border-border text-muted-foreground"
                          }`}
                        >
                          {a.isEnabled ? "Enabled" : "Disabled"}
                        </button>
                        <button
                          onClick={() => handleDeleteAuto(a.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Audit Log */}
        <TabsContent value="audit">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Database className="w-4 h-4 text-primary" /> System Audit Trail
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Review immutable transaction modifications logged by users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[60vh] overflow-y-auto space-y-3 pl-2 scrollbar-thin">
                {initialAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 border border-border bg-muted/15 rounded-lg flex flex-col gap-1 text-xs"
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground mb-1">
                      <span>Actor: {log.actorUserId?.name || "API Ingest Client"}</span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-foreground">
                      Action <strong className="font-mono text-[11px] bg-muted border px-1 rounded capitalize">{log.action}</strong> completed on entity{" "}
                      <strong className="font-mono text-[11px] bg-muted border px-1 rounded">{log.entityType}</strong> (ID: {log.entityId}).
                    </p>
                    {log.diff && (
                      <pre className="mt-1.5 p-2 bg-background border rounded text-[9px] font-mono text-muted-foreground overflow-x-auto">
                        {JSON.stringify(log.diff, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {initialAuditLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-6">
                    No logs logged yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Data Quality & Merge */}
        {(isAdmin || isManager) && (
          <TabsContent value="data-quality">
            <Card className="border border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-primary" /> Duplicate Contacts & Merging
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Scan your ledger for duplicate contact details and merge profiles to preserve timeline integrity.
                  </CardDescription>
                </div>
                <Button onClick={handleScanDuplicates} disabled={scanning} size="sm">
                  {scanning ? "Scanning..." : "Scan Duplicates"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {dupeGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8 bg-muted/5 border border-dashed rounded-lg">
                    No active duplicate groups loaded. Run a scan above to search by phone or email matches.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {dupeGroups.map((group, idx) => (
                      <div key={idx} className="p-4 border border-border bg-muted/10 rounded-lg space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono text-[11px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-primary font-bold">
                            Match: {group.field} = {group.value}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {group.contacts.length} occurrences
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.contacts.map((contact: any, cIdx: number) => {
                            const otherContact = group.contacts.find((x: any) => x.id !== contact.id);
                            return (
                              <div
                                key={contact.id}
                                className="p-3 border border-border bg-card rounded-md flex flex-col justify-between gap-2.5"
                              >
                                <div>
                                  <p className="text-xs font-bold text-foreground">
                                    {contact.firstName} {contact.lastName || ""}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    ID: {contact.id} | Score: {contact.score}
                                  </p>
                                </div>
                                {otherContact && (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => handleMerge(contact.id, otherContact.id)}
                                    disabled={mergingId === otherContact.id}
                                    className="w-full text-[10px] h-7 hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    {mergingId === otherContact.id
                                      ? "Merging..."
                                      : `Merge other profile into this one`}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {/* ── Tab: Branding ─────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="branding">
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" /> White-Label Branding
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Customise how this workspace looks. Changes apply to everyone in your org.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="appName" className="text-xs font-semibold">App Name</Label>
                    <Input id="appName" placeholder="Keel" value={brandingForm.appName ?? ""} onChange={(e) => setBrandingForm({ ...brandingForm, appName: e.target.value })} />
                    <p className="text-[10px] text-muted-foreground">Shown in sidebar header</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tagline" className="text-xs font-semibold">Tagline</Label>
                    <Input id="tagline" placeholder="The AI-native CRM" value={brandingForm.tagline ?? ""} onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })} />
                    <p className="text-[10px] text-muted-foreground">Shown on login page</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="logoUrl" className="text-xs font-semibold">Logo URL</Label>
                  <Input id="logoUrl" placeholder="https://yourcompany.com/logo.png" value={brandingForm.logoUrl ?? ""} onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })} />
                  <p className="text-[10px] text-muted-foreground">Paste a direct image URL (PNG/SVG, square 1:1 ratio recommended)</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="primaryColor" className="text-xs font-semibold">Primary Brand Color</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" id="primaryColor" value={brandingForm.primaryColor ?? "#2f5dff"} onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })} className="w-10 h-10 rounded-md cursor-pointer border border-border" />
                    <Input value={brandingForm.primaryColor ?? "#2f5dff"} onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })} placeholder="#2f5dff" className="font-mono text-xs w-32" />
                    <div className="flex-1 h-9 rounded-md border border-border transition-colors" style={{ backgroundColor: brandingForm.primaryColor ?? "#2f5dff" }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Used for buttons, active nav links, and highlights. Reload to see full effect.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invoiceTemplate" className="text-xs font-semibold">Default Invoice Template</Label>
                  <select
                    id="invoiceTemplate"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-slate-850 focus:outline-none cursor-pointer"
                    value={brandingForm.invoiceTemplate || "gradient"}
                    onChange={(e) => setBrandingForm({ ...brandingForm, invoiceTemplate: e.target.value as any })}
                  >
                    <option value="gradient">Gradient Sempurna (Purple/Red Design)</option>
                    <option value="yellow">Modern Yellow Accent (Yellow Lines Design)</option>
                    <option value="orange">Artisan Curve (Orange & Charcoal Design)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">Select the fixed, corporate document layout to apply automatically for all quotes and invoices.</p>
                </div>
                <Button disabled={brandingLoading} onClick={async () => {
                  setBrandingLoading(true);
                  try { await saveBrandingConfig(brandingForm); toast.success("Branding saved! Reload to see changes."); }
                  catch { toast.error("Failed to save branding."); }
                  finally { setBrandingLoading(false); }
                }}>
                  {brandingLoading ? "Saving..." : "Save Branding"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Tab: Widgets ─────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="widgets">
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Puzzle className="w-4 h-4 text-primary" /> Feature Widgets
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Enable or disable feature modules. Enabled vertical modules appear in the sidebar nav.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-5">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest mb-3">Core (always available)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {WIDGET_REGISTRY.filter((w) => w.category === "core").map((w) => {
                      const enabled = widgetMap[w.key] ?? false;
                      return (
                        <div key={w.key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"}`}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{w.icon}</span>
                            <div>
                              <p className="text-xs font-semibold">{w.label}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{w.description}</p>
                            </div>
                          </div>
                          <button type="button" disabled={widgetLoading === w.key} onClick={async () => {
                            setWidgetLoading(w.key);
                            try { await toggleWidget(w.key, !enabled); setWidgetMap((m) => ({ ...m, [w.key]: !enabled })); toast.success(`${w.label} ${!enabled ? "enabled" : "disabled"}`); }
                            catch { toast.error("Failed to update widget"); }
                            finally { setWidgetLoading(null); }
                          }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${enabled ? "bg-primary" : "bg-border"}`}>
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest mb-3">Industry Modules</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {WIDGET_REGISTRY.filter((w) => w.category === "vertical").map((w) => {
                      const enabled = widgetMap[w.key] ?? false;
                      return (
                        <div key={w.key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"}`}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{w.icon}</span>
                            <div>
                              <p className="text-xs font-semibold">{w.label}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{w.description}</p>
                            </div>
                          </div>
                          <button type="button" disabled={widgetLoading === w.key} onClick={async () => {
                            setWidgetLoading(w.key);
                            try { await toggleWidget(w.key, !enabled); setWidgetMap((m) => ({ ...m, [w.key]: !enabled })); toast.success(`${w.label} ${!enabled ? "enabled" : "disabled"}`); }
                            catch { toast.error("Failed to update widget"); }
                            finally { setWidgetLoading(null); }
                          }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${enabled ? "bg-primary" : "bg-border"}`}>
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Custom Fields Studio */}
        <TabsContent value="custom-fields" className="space-y-4">
          <CustomFieldsStudio />
        </TabsContent>

        {/* Tab: Custom Objects Modeler */}
        {isAdmin && (
          <TabsContent value="custom-objects" className="space-y-4">
            <CustomObjectsStudio />
          </TabsContent>
        )}
      </Tabs>

      {/* dialog for API Key Display */}

      <Dialog open={!!generatedKey} onOpenChange={() => setGeneratedKey(null)}>
        <DialogContent className="sm:max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1 text-primary">
              <Sparkles className="w-5 h-5 text-ai" /> Save your API Key
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please copy this API key now. For security purposes, it will not be displayed again.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/60 border border-border rounded font-mono text-xs text-foreground select-all break-all relative">
            {generatedKey}
          </div>
          <DialogFooter>
            <Button onClick={() => setGeneratedKey(null)}>Got it, Closed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Pipeline Creation */}
      <Dialog open={showPipelineDialog} onOpenChange={setShowPipelineDialog}>
        <DialogContent className="sm:max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Add New Sales Pipeline</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create an independent sales pipeline with default funnel stages.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePipelineInSettings} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pipeName">Pipeline Name *</Label>
              <Input
                id="pipeName"
                value={pipelineForm.name}
                onChange={(e) => setPipelineForm({ ...pipelineForm, name: e.target.value })}
                placeholder="e.g. Inbound Enterprise"
                disabled={pipelineLoading}
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="pipeDefault"
                checked={pipelineForm.isDefault}
                onChange={(e) => setPipelineForm({ ...pipelineForm, isDefault: e.target.checked })}
                className="rounded border-border"
              />
              <Label htmlFor="pipeDefault" className="text-xs text-muted-foreground cursor-pointer">
                Set as default organization pipeline
              </Label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPipelineDialog(false)}
                disabled={pipelineLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pipelineLoading}>
                {pipelineLoading ? "Creating..." : "Create Pipeline"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog for Stage Creation */}
      <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
        <DialogContent className="sm:max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Add Stage</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateStage} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="stageName">Stage Name *</Label>
              <Input
                id="stageName"
                value={stageForm.name}
                onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                placeholder="e.g. Negotiation"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="stageProb">Probability (0-100) *</Label>
                <Input
                  id="stageProb"
                  type="number"
                  value={stageForm.probability}
                  onChange={(e) => setStageForm({ ...stageForm, probability: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stageType">Stage Type</Label>
                <Select
                  value={stageForm.type}
                  onValueChange={(val) => setStageForm({ ...stageForm, type: val })}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="won">Won (100%)</SelectItem>
                    <SelectItem value="lost">Lost (0%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="stageColor">Stage Dot Color</Label>
              <Input
                id="stageColor"
                value={stageForm.color}
                onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                placeholder="#2f5dff"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowStageDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={stageLoading}>
                {stageLoading ? "Adding..." : "Add Stage"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog for Webhook Creation */}
      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent className="sm:max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Register Outgoing Webhook</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWebhook} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="webhookUrl">Target URL *</Label>
              <Input
                id="webhookUrl"
                value={webhookForm.targetUrl}
                onChange={(e) => setWebhookForm({ ...webhookForm, targetUrl: e.target.value })}
                placeholder="https://api.yourdomain.com/webhooks"
              />
            </div>
            <div className="space-y-1">
              <Label>Events *</Label>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1.5">
                {[
                  "contact.created",
                  "deal.stage_changed",
                  "activity.created",
                  "task.overdue",
                ].map((ev) => (
                  <label key={ev} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookForm.events.includes(ev)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setWebhookForm((prev) => ({
                          ...prev,
                          events: checked
                            ? [...prev.events, ev]
                            : prev.events.filter((t) => t !== ev),
                        }));
                      }}
                      className="rounded border-border text-primary"
                    />
                    {ev}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowWebhookDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={webhookLoading}>
                {webhookLoading ? "Saving..." : "Create Webhook"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog for Automation Creation */}
      <Dialog open={showAutoDialog} onOpenChange={setShowAutoDialog}>
        <DialogContent className="sm:max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Create Workflow Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAuto} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="autoName">Rule Name *</Label>
              <Input
                id="autoName"
                value={autoForm.name}
                onChange={(e) => setAutoForm({ ...autoForm, name: e.target.value })}
                placeholder="e.g. Stage Change Task Trigger"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="autoTrigger">Trigger Event *</Label>
              <Select
                value={autoForm.trigger}
                onValueChange={(val) => setAutoForm({ ...autoForm, trigger: val })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="deal_stage_changed">On Deal Stage Change</SelectItem>
                  <SelectItem value="contact_created">On Contact Created</SelectItem>
                  <SelectItem value="activity_created">On Activity Created</SelectItem>
                  <SelectItem value="quote_accepted">On Quote Accepted</SelectItem>
                  <SelectItem value="invoice_overdue">On Invoice Overdue</SelectItem>
                  <SelectItem value="followup_due">On Follow-up Due</SelectItem>
                  <SelectItem value="deliverable_approved">On Deliverable Approved</SelectItem>
                  <SelectItem value="payment_received">On Payment Received</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Stage Match Filters */}
            {autoForm.trigger === "deal_stage_changed" && (
              <div className="space-y-2.5 p-3 rounded-lg border border-border/80 bg-muted/20">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoForm.hasCondition}
                    onChange={(e) => setAutoForm({ ...autoForm, hasCondition: e.target.checked })}
                    className="rounded border-border text-primary accent-primary"
                  />
                  Filter by target Deal stage
                </label>
                {autoForm.hasCondition && (
                  <div className="space-y-1 mt-1">
                    <Label className="text-[10px]">Trigger only when stage becomes *</Label>
                    <Select
                      value={autoForm.conditionValue || ""}
                      onValueChange={(val: string | null) => setAutoForm({ ...autoForm, conditionValue: val || "" })}
                    >
                      <SelectTrigger className="bg-card text-xs h-8">
                        <SelectValue placeholder="Select target stage..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {activePipeline?.stages?.map((st) => (
                          <SelectItem key={st.id} value={st.id || ""}>{st.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="autoAction">Action *</Label>
              <Select
                value={autoForm.actionType}
                onValueChange={(val) => setAutoForm({ ...autoForm, actionType: val })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="create_task">Create Follow-up Task</SelectItem>
                  <SelectItem value="add_tag">Add Tag to Contact</SelectItem>
                  <SelectItem value="call_webhook">Trigger Outbound Webhook</SelectItem>
                  <SelectItem value="send_email">Send Automated Email</SelectItem>
                  <SelectItem value="create_followup">Schedule Client Follow-up</SelectItem>
                  <SelectItem value="create_invoice_reminder">Dispatch Payment Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Action Config Panels */}
            {autoForm.actionType === "create_task" && (
              <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/10">
                <div className="space-y-1">
                  <Label htmlFor="autoTask" className="text-[10px]">Task Title *</Label>
                  <Input
                    id="autoTask"
                    value={autoForm.taskTitle}
                    onChange={(e) => setAutoForm({ ...autoForm, taskTitle: e.target.value })}
                    placeholder="e.g. Call shipper for routing update"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="autoTaskDesc" className="text-[10px]">Task Description</Label>
                  <Input
                    id="autoTaskDesc"
                    value={autoForm.taskDesc}
                    onChange={(e) => setAutoForm({ ...autoForm, taskDesc: e.target.value })}
                    placeholder="e.g. Details about the freight rate margins"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="autoTaskDue" className="text-[10px]">Due in (Days)</Label>
                  <Input
                    id="autoTaskDue"
                    type="number"
                    value={autoForm.taskDueDays}
                    onChange={(e) => setAutoForm({ ...autoForm, taskDueDays: parseInt(e.target.value) || 2 })}
                    placeholder="2"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {autoForm.actionType === "add_tag" && (
              <div className="space-y-1 p-3 rounded-lg border border-border bg-muted/10">
                <Label htmlFor="autoTagValue" className="text-[10px]">Tag to apply *</Label>
                <Input
                  id="autoTagValue"
                  value={autoForm.tagValue}
                  onChange={(e) => setAutoForm({ ...autoForm, tagValue: e.target.value })}
                  placeholder="e.g. VIP-CARRIER"
                  className="h-8 text-xs"
                />
              </div>
            )}

            {autoForm.actionType === "call_webhook" && (
              <div className="space-y-1 p-3 rounded-lg border border-border bg-muted/10">
                <Label htmlFor="autoWebhookUrl" className="text-[10px]">Target Webhook URL *</Label>
                <Input
                  id="autoWebhookUrl"
                  value={autoForm.webhookUrl}
                  onChange={(e) => setAutoForm({ ...autoForm, webhookUrl: e.target.value })}
                  placeholder="e.g. https://api.carrier.com/webhook"
                  className="h-8 text-xs"
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowAutoDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={autoLoading}>
                {autoLoading ? "Creating..." : "Save Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog for Invitation */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="inviteName">Full Name *</Label>
              <Input
                id="inviteName"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inviteEmail">Email *</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inviteRole">Role *</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(val) => setInviteForm({ ...inviteForm, role: val })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="rep">Sales Rep</SelectItem>
                  {isAdmin && <SelectItem value="manager">Sales Manager</SelectItem>}
                  {isAdmin && <SelectItem value="admin">System Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="invitePass">Temporary Password *</Label>
              <Input
                id="invitePass"
                type="password"
                value={inviteForm.password}
                onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? "Adding..." : "Invite User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
