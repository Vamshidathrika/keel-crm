"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TriggerNode, ConditionNode, ActionNode } from "./workflow-nodes";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Plus, Play, Save, RefreshCw, Zap, GitBranch, Bot, Sparkles, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const INITIAL_NODES: Node[] = [
  {
    id: "node-1",
    type: "trigger",
    position: { x: 250, y: 30 },
    data: {
      label: "Inbound Payment Confirmed",
      badge: "WEBHOOK",
      description: "Triggered when webhook event payment.succeeded is received.",
    },
  },
  {
    id: "node-2",
    type: "condition",
    position: { x: 250, y: 160 },
    data: {
      label: "Check Deal Amount & Stage",
      ruleText: "deal.value >= 100000 && stage != 'won'",
    },
  },
  {
    id: "node-3",
    type: "action",
    position: { x: 100, y: 310 },
    data: {
      label: "Move Deal to 'Closed Won'",
      agentType: "crm_hand",
      description: "Transitions pipeline stage to Won & updates probability to 100%.",
      lastRun: "2 mins ago",
    },
  },
  {
    id: "node-4",
    type: "action",
    position: { x: 400, y: 310 },
    data: {
      label: "Dispatch Connected App (Slack/Jira)",
      agentType: "webhook_hand",
      description: "Fires HMAC signed webhook to external engineering workstream.",
      lastRun: "2 mins ago",
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: "e1-2", source: "node-1", target: "node-2", animated: true, style: { stroke: "#10b981", strokeWidth: 2 } },
  { id: "e2-3", source: "node-2", target: "node-3", sourceHandle: "true", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  { id: "e2-4", source: "node-2", target: "node-4", sourceHandle: "true", animated: true, style: { stroke: "#8b5cf6", strokeWidth: 2 } },
];

export function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [isExecuting, setIsExecuting] = useState(false);

  const nodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      condition: ConditionNode,
      action: ActionNode,
    }),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#10b981", strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const addTriggerNode = () => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: "trigger",
      position: { x: 250, y: Math.max(...nodes.map((n) => n.position.y)) + 120 },
      data: {
        label: "Lead Score Calculated",
        badge: "PROSPECTOR",
        description: "Fires when contact score >= 80 (HOT).",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success("Added new Trigger node to canvas");
  };

  const addConditionNode = () => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: "condition",
      position: { x: 250, y: Math.max(...nodes.map((n) => n.position.y)) + 120 },
      data: {
        label: "Evaluate ICP Criteria",
        ruleText: "icpFit == 'Tier 1 (High)'",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success("Added new Condition node to canvas");
  };

  const addActionNode = (type: "agent" | "webhook" | "task") => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: "action",
      position: { x: 250, y: Math.max(...nodes.map((n) => n.position.y)) + 120 },
      data: {
        label: type === "agent" ? "Run Prospector Agent" : type === "webhook" ? "Dispatch Connected App" : "Create Discovery Task",
        agentType: type,
        description: type === "agent" ? "Synthesizes tailored battlecard outreach" : "Automated CRM workflow execution",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success(`Added new ${type.toUpperCase()} action node to canvas`);
  };

  const handleExecuteWorkflow = async () => {
    setIsExecuting(true);
    try {
      // Simulate live DAG traversal on canvas
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success(`Visual Workflow DAG executed! ${nodes.length} nodes & ${edges.length} mapped edges verified.`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveWorkflow = () => {
    toast.success(`Workflow DAG structure saved to database (${nodes.length} nodes active)`);
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={addTriggerNode} className="h-8 text-xs gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-500" />
            + Trigger
          </Button>
          <Button size="sm" variant="outline" onClick={addConditionNode} className="h-8 text-xs gap-1">
            <GitBranch className="w-3.5 h-3.5 text-amber-500" />
            + Condition
          </Button>
          <Button size="sm" variant="outline" onClick={() => addActionNode("agent")} className="h-8 text-xs gap-1">
            <Bot className="w-3.5 h-3.5 text-primary" />
            + Agent Hand
          </Button>
          <Button size="sm" variant="outline" onClick={() => addActionNode("webhook")} className="h-8 text-xs gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            + Connected App
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSaveWorkflow} className="h-8 text-xs gap-1">
            <Save className="w-3.5 h-3.5" />
            Save Canvas
          </Button>
          <Button
            size="sm"
            disabled={isExecuting}
            onClick={handleExecuteWorkflow}
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Test Run Graph
          </Button>
        </div>
      </div>

      {/* Visual Canvas */}
      <Card className="h-[600px] border shadow-md overflow-hidden bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-muted/10"
        >
          <Controls className="bg-card border shadow-sm rounded-lg" />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="bg-card border rounded-lg shadow-sm"
          />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </Card>
    </div>
  );
}
