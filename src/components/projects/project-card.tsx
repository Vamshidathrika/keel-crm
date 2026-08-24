"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: any;
  onStatusChange: (id: string, status: "planning" | "active" | "completed" | "on_hold") => void;
}

export function ProjectCard({ project, onStatusChange }: ProjectCardProps) {
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
        <CardDescription className="text-xs text-muted-foreground">
          Client: {project.client?.name || "Direct Client"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Budget</span>
          <span className="font-semibold text-foreground">
            ₹{(project.budget || 0).toLocaleString()}
          </span>
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
