"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Plus, ExternalLink, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { addDeliverable } from "@/app/actions/projects";
import { toast } from "sonner";
import Link from "next/link";

interface ProjectCardProps {
  project: any;
  onStatusChange: (id: string, status: "planning" | "active" | "completed" | "on_hold") => void;
}

export function ProjectCard({ project, onStatusChange }: ProjectCardProps) {
  const [deliverables, setDeliverables] = useState(project.deliverables || []);
  const [showAddDeliv, setShowAddDeliv] = useState(false);
  const [delivTitle, setDelivTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivTitle.trim()) return;

    setIsAdding(true);
    try {
      const created = await addDeliverable({
        projectId: project.id,
        title: delivTitle.trim(),
      });
      setDeliverables([...deliverables, created]);
      setDelivTitle("");
      setShowAddDeliv(false);
      toast.success("Deliverable added and synced to Client Portal for sign-off!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add deliverable");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
              project.status === "completed"
                ? "bg-emerald-500/10 text-emerald-500"
                : project.status === "on_hold"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-blue-500/10 text-blue-500"
            }`}
          >
            {project.status?.toUpperCase() || "ACTIVE"}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{project.id}</span>
        </div>
        <CardTitle className="text-sm font-semibold pt-1">{project.name}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground flex items-center justify-between">
          <span>Client: {project.client?.name || "Direct Client"}</span>
          {project.client?.portalToken && (
            <Link
              href={`/portal/${project.client.portalToken}`}
              target="_blank"
              className="text-primary hover:underline flex items-center gap-1 font-mono text-[10px]"
            >
              <span>Portal</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Budget</span>
          <span className="font-semibold text-foreground font-mono">
            ₹{(project.budget || 0).toLocaleString()}
          </span>
        </div>

        {/* Deliverables List */}
        <div className="space-y-1.5 pt-2 border-t">
          <div className="flex justify-between items-center text-[11px] font-semibold text-foreground">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-primary" /> Deliverables ({deliverables.length})
            </span>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setShowAddDeliv(!showAddDeliv)}
              className="h-5 px-1.5 text-[10px] text-primary"
            >
              <Plus className="w-3 h-3 mr-0.5" /> Add
            </Button>
          </div>

          {showAddDeliv && (
            <form onSubmit={handleAddDeliverable} className="flex gap-1.5 pt-1">
              <Input
                placeholder="Deliverable title..."
                value={delivTitle}
                onChange={(e) => setDelivTitle(e.target.value)}
                className="h-7 text-[11px]"
                autoFocus
              />
              <Button size="xs" type="submit" disabled={isAdding} className="h-7 text-[10px]">
                Save
              </Button>
            </form>
          )}

          <div className="space-y-1 max-h-32 overflow-y-auto">
            {deliverables.map((d: any) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-1.5 rounded bg-muted/20 border text-[10px]"
              >
                <span className="font-medium truncate max-w-[150px]">{d.title}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    d.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : d.status === "changes_requested"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-ai/10 text-ai"
                  }`}
                >
                  {d.status?.replace("_", " ") || "pending"}
                </span>
              </div>
            ))}
            {deliverables.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic py-1">No deliverables added yet.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-1 pt-2 border-t">
          {project.status !== "completed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => onStatusChange(project.id, "completed")}
            >
              Mark Completed
            </Button>
          )}
          {project.status === "completed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => onStatusChange(project.id, "active")}
            >
              Re-Open
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

