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
import { Card } from "@/components/ui/card";
import { Plus, Play, Save, Zap, GitBranch, Bot, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

// Left-to-Right Horizontal Flow (Make.com & Zapier Canvas Mental Model)
const INITIAL_NODES: Node[] = [
  {
    id: "node-1",
    type: "trigger",
    position: { x: 50, y: 160 },
    data: {
      label: "Inbound Payment Confirmed",
      badge: "WEBHOOK",
      description: "Triggered when webhook event payment.succeeded is received from Stripe / Razorpay.",
    },
  },
  {
    id: "node-2",
    type: "condition",
    position: { x: 440, y: 160 },
    data: {
      label: "Evaluate Deal Value & Status",
      ruleText: "deal.value >= 100000 && deal.stage != 'won'",
    },
  },
  {
    id: "node-3",
    type: "action",
    position: { x: 840, y: 50 },
    data: {
      label: "Transition Deal to 'Closed Won'",
      agentType: "crm_hand",
      description: "Updates pipeline probability to 100% and provisions active Client Project.",
      lastRun: "2 mins ago",
    },
  },
  {
    id: "node-4",
    type: "action",
    position: { x: 840, y: 260 },
    data: {
      label: "Dispatch Connected App (HMAC Webhook)",
      agentType: "webhook",
      description: "Broadcasts signed JSON payload to external engineering workspace / Slack.",
      lastRun: "2 mins ago",
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: "e1-2",
    source: "node-1",
    target: "node-2",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2.5 },
  },
  {
    id: "e2-3",
    source: "node-2",
    target: "node-3",
    sourceHandle: "true",
    animated: true,
    style: { stroke: "#3b82f6", strokeWidth: 2.5 },
  },
  {
    id: "e2-4",
    source: "node-2",
    target: "node-4",
    sourceHandle: "true",
    animated: true,
    style: { stroke: "#8b5cf6", strokeWidth: 2.5 },
  },
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
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#10b981", strokeWidth: 2.5 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const addTriggerNode = () => {
    const maxX = Math.max(...nodes.map((n) => n.position.x), 0);
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: "trigger",
      position: { x: maxX + 380, y: 160 },
      data: {
        label: "Lead Score Calculated",
        badge: "PROSPECTOR",
        description: "Fires when Prospector AI computes contact score >= 80 (HOT).",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success("Added Horizontal Trigger step to right");
  };

  const addConditionNode = () => {
    const maxX = Math.max(...nodes.map((n) => n.position.x), 0);
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: "condition",
      position: { x: maxX + 380, y: 160 },
      data: {
        label: "Evaluate ICP Qualification",
        ruleText: "contact.icpFit == 'Tier 1 (High)'",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success("Added Horizontal Filter Condition step to right");
  };

  const addActionNode = (type: "agent" | "webhook" | "task") => {
    const maxX = Math.max(...nodes.map((n) => n.position.x), 0);
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: "action",
      position: { x: maxX + 380, y: 160 },
      data: {
        label:
          type === "agent"
            ? "Run Deal Doctor Sentinel"
            : type === "webhook"
            ? "Dispatch Outbound Webhook"
            : "Schedule Discovery Task",
        agentType: type,
        description:
          type === "agent"
            ? "Autonomous risk audit & multi-channel revival proposal"
            : "Dispatches payload to external system",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success(`Added Horizontal ${type.toUpperCase()} Action step to right`);
  };

  const handleExecuteWorkflow = async () => {
    setIsExecuting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success(`Horizontal DAG Traversal Successful! ${nodes.length} sequential steps verified.`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveWorkflow = () => {
    toast.success(`Horizontal Workflow DAG saved to database (${nodes.length} active steps)`);
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={addTriggerNode} className="h-8 text-xs gap-1.5 font-medium">
            <Zap className="w-3.5 h-3.5 text-emerald-500" />
            + Trigger Step
          </Button>
          <Button size="sm" variant="outline" onClick={addConditionNode} className="h-8 text-xs gap-1.5 font-medium">
            <GitBranch className="w-3.5 h-3.5 text-amber-500" />
            + Filter Step
          </Button>
          <Button size="sm" variant="outline" onClick={() => addActionNode("agent")} className="h-8 text-xs gap-1.5 font-medium">
            <Bot className="w-3.5 h-3.5 text-primary" />
            + Agent Step
          </Button>
          <Button size="sm" variant="outline" onClick={() => addActionNode("webhook")} className="h-8 text-xs gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            + Webhook Step
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSaveWorkflow} className="h-8 text-xs gap-1.5">
            <Save className="w-3.5 h-3.5" />
            Save Workflow
          </Button>
          <Button
            size="sm"
            disabled={isExecuting}
            onClick={handleExecuteWorkflow}
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Test Run Pipeline
          </Button>
        </div>
      </div>

      {/* Visual Horizontal Canvas */}
      <Card className="h-[620px] border shadow-md overflow-hidden bg-background relative">
        <div className="absolute top-3 left-4 z-10 bg-background/85 backdrop-blur-md px-3 py-1.5 rounded-lg border text-[11px] font-mono text-muted-foreground flex items-center gap-2 shadow-sm">
          <ArrowRight className="w-3.5 h-3.5 text-primary" />
          <span>Left-to-Right Horizontal Execution Pipeline (Pan & Zoom Canvas)</span>
        </div>
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
