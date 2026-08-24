"use client";

import React, { useState } from "react";
import { FolderKanban, Plus, Search, CheckCircle2, Clock, AlertCircle, Calendar, Users, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProject, updateProjectStatus } from "@/app/actions/projects";

interface ProjectsClientProps {
  user: any;
  initialProjects: any[];
}

export default function ProjectsClient({ user, initialProjects }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newForm, setNewForm] = useState({
    title: "",
    clientName: "",
    budget: "",
    deadline: "",
    status: "active" as "active" | "completed" | "on_hold",
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title || !newForm.clientName) return;

    setLoading(true);
    try {
      const created = await createProject({
        title: newForm.title,
        clientName: newForm.clientName,
        budget: newForm.budget ? Number(newForm.budget) : undefined,
        status: newForm.status,
      });

      setProjects([created, ...projects]);
      setShowAdd(false);
      setNewForm({ title: "", clientName: "", budget: "", deadline: "", status: "active" });
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: "active" | "completed" | "on_hold") => {
    try {
      await updateProjectStatus(id, status);
      setProjects(projects.map((p) => (p.id === id ? { ...p, status } : p)));
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const filtered = projects.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" />
            Project & Deliverable Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Track customer engagements, project milestones, budgets, and post-sale deliverable deadlines.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Add Project Form */}
      {showAdd && (
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Initiate New Project</CardTitle>
            <CardDescription className="text-xs">
              Record a new customer delivery contract, assigned budget, and target deadline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Project Name</label>
                  <Input
                    required
                    placeholder="e.g. Enterprise Cloud Implementation"
                    value={newForm.title}
                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Client / Account</label>
                  <Input
                    required
                    placeholder="e.g. Acme Corp"
                    value={newForm.clientName}
                    onChange={(e) => setNewForm({ ...newForm, clientName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Budget (₹)</label>
                  <Input
                    type="number"
                    placeholder="1500000"
                    value={newForm.budget}
                    onChange={(e) => setNewForm({ ...newForm, budget: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Target Deadline</label>
                  <Input
                    type="date"
                    value={newForm.deadline}
                    onChange={(e) => setNewForm({ ...newForm, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground text-sm border rounded-lg">
            No projects found. Click "New Project" to start tracking client deliverables.
          </div>
        ) : (
          filtered.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      p.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : p.status === "on_hold"
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    {p.status?.toUpperCase() || "ACTIVE"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">{p.id}</span>
                </div>
                <CardTitle className="text-sm font-semibold pt-1">{p.name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Client: {p.client?.name || "Direct Client"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Budget</span>
                  <span className="font-semibold text-foreground">
                    ₹{(p.budget || 0).toLocaleString()}
                  </span>
                </div>
                {p.deadline && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Deadline</span>
                    <span className="text-foreground">{p.deadline}</span>
                  </div>
                )}
                <div className="flex justify-end gap-1 pt-2 border-t">
                  {p.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px]"
                      onClick={() => handleStatusChange(p.id, "completed")}
                    >
                      Mark Completed
                    </Button>
                  )}
                  {p.status === "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px]"
                      onClick={() => handleStatusChange(p.id, "active")}
                    >
                      Re-Open
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
