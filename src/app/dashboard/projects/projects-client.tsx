"use client";

import React, { useState } from "react";
import { Briefcase, Plus, Search, Calendar, CheckSquare, Clock, User, Award } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProjectsClientProps {
  user: any;
}

const INITIAL_PROJECTS = [
  {
    id: "PRJ-601",
    name: "Enterprise ERP Implementation Strategy",
    client: "Global Logistics Group",
    milestone: "Phase 1 Assessment Delivery",
    dueDate: "2026-08-15",
    billedHrs: "42 hrs",
    budget: "₹25,00,000",
    status: "Active",
  },
  {
    id: "PRJ-602",
    name: "Talent Compensation Structuring",
    client: "Novartis Bio India",
    milestone: "Final Benchmarking Presentation",
    dueDate: "2026-07-28",
    billedHrs: "18 hrs",
    budget: "₹8,50,000",
    status: "Active",
  },
  {
    id: "PRJ-603",
    name: "Market Penetration Roadmap",
    client: "Supermart E-retail",
    milestone: "Initial Proposal Sign-off",
    dueDate: "2026-09-02",
    billedHrs: "0 hrs",
    budget: "₹15,00,000",
    status: "Planning",
  },
];

export default function ProjectsClient({ user }: ProjectsClientProps) {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    client: "",
    milestone: "",
    dueDate: "",
    billedHrs: "0 hrs",
    budget: "",
    status: "Planning",
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name || !newForm.client || !newForm.budget) return;
    const newPrj = {
      id: `PRJ-${Math.floor(600 + Math.random() * 400)}`,
      ...newForm,
    };
    setProjects([newPrj, ...projects]);
    setShowAdd(false);
    setNewForm({
      name: "",
      client: "",
      milestone: "",
      dueDate: "",
      billedHrs: "0 hrs",
      budget: "",
      status: "Planning",
    });
  };

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" /> Consulting Projects
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Consulting Vertical — Track consulting client milestones, deliverables, project budgets, and logged time logs.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Log Project
        </Button>
      </div>

      {showAdd && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold">New Consulting Project Account</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Define milestones, target due dates, and fee budgets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Project Name</label>
                  <Input
                    placeholder="e.g. Org Restructuring"
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Client Name</label>
                  <Input
                    placeholder="Corporate Client name"
                    value={newForm.client}
                    onChange={(e) => setNewForm({ ...newForm, client: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Current Milestone / Deliverable</label>
                  <Input
                    placeholder="e.g. Phase 1 Report Delivery"
                    value={newForm.milestone}
                    onChange={(e) => setNewForm({ ...newForm, milestone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Project Fee Budget</label>
                  <Input
                    placeholder="e.g. ₹15,00,000"
                    value={newForm.budget}
                    onChange={(e) => setNewForm({ ...newForm, budget: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Target Delivery Date</label>
                  <Input
                    type="date"
                    value={newForm.dueDate}
                    onChange={(e) => setNewForm({ ...newForm, dueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Project State</label>
                  <select
                    value={newForm.status}
                    onChange={(e) => setNewForm({ ...newForm, status: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option>Planning</option>
                    <option>Active</option>
                    <option>On Hold</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit">Publish Project</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="border border-border bg-card">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {p.id}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> Milestone: {p.milestone || "None defined"}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-1">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.client}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span>Billed Time: <span className="font-semibold text-foreground">{p.billedHrs}</span></span>
                  <span>•</span>
                  <span>Budget: <span className="font-semibold text-foreground">{p.budget}</span></span>
                </div>
              </div>

              <div className="flex sm:flex-col items-end gap-4 sm:gap-2 justify-between">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  p.status === "Active" ? "bg-success/15 text-success" :
                  p.status === "Planning" ? "bg-primary/15 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {p.status}
                </span>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Due Date</p>
                  <p className="text-xs font-semibold flex items-center gap-1 justify-end mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {p.dueDate || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
