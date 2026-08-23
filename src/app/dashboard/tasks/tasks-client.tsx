"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Plus,
  Clock,
  User,
  Building2,
  DollarSign,
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  Trash2,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask, toggleTaskStatus, deleteTask } from "@/app/actions/tasks";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isDone: boolean;
  completedAt: string | null;
  relatedContactId: string | null;
  relatedCompanyId: string | null;
  relatedDealId: string | null;
  assigneeId: string | null;
  createdAt: string;
  relatedContact?: { firstName: string; lastName: string | null } | null;
  relatedCompany?: { name: string } | null;
  relatedDeal?: { title: string } | null;
  assignee?: { name: string } | null;
};

type Contact = { id: string; firstName: string; lastName: string | null };
type Company = { id: string; name: string };
type Deal = { id: string; title: string };

interface TasksClientProps {
  initialTasks: Task[];
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
  currentUser: any;
}

export default function TasksClient({
  initialTasks,
  contacts,
  companies,
  deals,
  currentUser,
}: TasksClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<"pending" | "completed">("pending");
  const [selectedTask, setSelectedTask] = useState<Task | null>(tasks[0] || null);

  // Task creation states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    relatedContactId: "none",
    relatedCompanyId: "none",
    relatedDealId: "none",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const isOverdue = (task: Task) => {
    if (task.isDone || !task.dueDate) return false;
    const due = new Date(task.dueDate).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return due < today;
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "pending") return !t.isDone;
    return t.isDone;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      toast.error("Task Title is required");
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        dueDate: createForm.dueDate || undefined,
        relatedContactId: createForm.relatedContactId === "none" ? undefined : createForm.relatedContactId,
        relatedCompanyId: createForm.relatedCompanyId === "none" ? undefined : createForm.relatedCompanyId,
        relatedDealId: createForm.relatedDealId === "none" ? undefined : createForm.relatedDealId,
      };

      const newTask = await createTask(payload);

      // Link mappings locally
      const mappedContact = contacts.find((ct) => ct.id === newTask.relatedContactId);
      const mappedCompany = companies.find((cp) => cp.id === newTask.relatedCompanyId);
      const mappedDeal = deals.find((d) => d.id === newTask.relatedDealId);

      const taskWithRelations: Task = {
        ...newTask,
        relatedContact: mappedContact ? { firstName: mappedContact.firstName, lastName: mappedContact.lastName } : null,
        relatedCompany: mappedCompany ? { name: mappedCompany.name } : null,
        relatedDeal: mappedDeal ? { title: mappedDeal.title } : null,
        assignee: { name: currentUser.name },
      };

      setTasks((prev) => [taskWithRelations, ...prev]);
      setShowCreateDialog(false);
      setCreateForm({
        title: "",
        description: "",
        dueDate: "",
        relatedContactId: "none",
        relatedCompanyId: "none",
        relatedDealId: "none",
      });
      toast.success("Task created");
      setSelectedTask(taskWithRelations);
    } catch (err: any) {
      toast.error("Failed to create task");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleDone = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await toggleTaskStatus(id, !currentStatus);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, isDone: updated.isDone, completedAt: updated.completedAt } : t
        )
      );
      toast.success(`Task ${!currentStatus ? "completed" : "reopened"}`);
      
      // Update selected view
      if (selectedTask?.id === id) {
        setSelectedTask((prev) => prev ? { ...prev, isDone: updated.isDone, completedAt: updated.completedAt } : null);
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (selectedTask?.id === id) {
        setSelectedTask(null);
      }
      toast.success("Task deleted");
    } catch (err) {
      toast.error("Failed to delete task");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-primary" /> Tasks
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Organize action items, manage follow-up tasks, and track completions.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Tasks List Panel */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex rounded-md overflow-hidden border border-border bg-card p-0.5 w-full">
            <button
              onClick={() => setFilter("pending")}
              className={`flex-1 py-1.5 rounded-sm text-xs font-semibold transition-colors text-center ${
                filter === "pending" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Pending ({tasks.filter((t) => !t.isDone).length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`flex-1 py-1.5 rounded-sm text-xs font-semibold transition-colors text-center ${
                filter === "completed" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Completed ({tasks.filter((t) => t.isDone).length})
            </button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
            {filteredTasks.map((t) => {
              const overdue = isOverdue(t);
              const isSelected = selectedTask?.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 bg-card hover:border-primary/30 ${
                    isSelected ? "border-primary ring-1 ring-primary/20 bg-accent/10" : "border-border"
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleDone(t.id, t.isDone);
                    }}
                    className="mt-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                  >
                    {t.isDone ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-success fill-success/10" />
                    ) : (
                      <Circle className="w-4.5 h-4.5" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold text-foreground truncate ${
                        t.isDone ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {t.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1.5 font-mono">
                      <Calendar className="w-3 h-3" />
                      <span className={overdue ? "text-destructive font-semibold" : ""}>
                        {t.dueDate || "No due date"}
                      </span>
                      {overdue && (
                        <span className="flex items-center gap-0.5 text-destructive font-semibold text-[9px] uppercase font-sans">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground italic">
                No tasks match this filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="md:col-span-2">
          {selectedTask ? (
            <Card className="border border-border bg-card h-full flex flex-col justify-between">
              <CardHeader className="border-b border-border bg-muted/10 p-5 flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className={`text-base font-bold ${selectedTask.isDone ? "line-through text-muted-foreground" : ""}`}>
                    {selectedTask.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-4 text-xs mt-2 text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Due: <strong className="text-foreground">{selectedTask.dueDate || "None"}</strong>
                    </span>
                    {selectedTask.assignee && (
                      <span>Assignee: <strong className="text-foreground">{selectedTask.assignee.name}</strong></span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive border-border"
                  onClick={() => handleDeleteTask(selectedTask.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-6 flex-1 space-y-6">
                {selectedTask.description && (
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Description
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded border">
                      {selectedTask.description}
                    </p>
                  </div>
                )}

                {/* linkages references */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Linkages References
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 border border-border bg-muted/10 rounded-lg flex items-center gap-2">
                      <User className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-mono text-muted-foreground">Contact</span>
                        <p className="font-semibold text-foreground truncate">
                          {selectedTask.relatedContact
                            ? `${selectedTask.relatedContact.firstName} ${selectedTask.relatedContact.lastName || ""}`
                            : "None"}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 border border-border bg-muted/10 rounded-lg flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-mono text-muted-foreground">Company</span>
                        <p className="font-semibold text-foreground truncate">
                          {selectedTask.relatedCompany?.name || "None"}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 border border-border bg-muted/10 rounded-lg flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-mono text-muted-foreground">Deal</span>
                        <p className="font-semibold text-foreground truncate">
                          {selectedTask.relatedDeal?.title || "None"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full border border-dashed rounded-lg border-border flex flex-col justify-center items-center p-8 text-center text-muted-foreground bg-muted/5 min-h-[300px]">
              <ListTodo className="w-8 h-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold">No Task Selected</p>
              <p className="text-xs">Click a task from the list or create one to view details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. Schedule fleet proposal demo"
                disabled={createLoading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Details or specific talking points..."
                disabled={createLoading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                disabled={createLoading}
                className="bg-card"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contact">Link Contact</Label>
              <Select
                value={createForm.relatedContactId}
                onValueChange={(val) => setCreateForm({ ...createForm, relatedContactId: val as string })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">None</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="company">Link Company</Label>
              <Select
                value={createForm.relatedCompanyId}
                onValueChange={(val) => setCreateForm({ ...createForm, relatedCompanyId: val as string })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">None</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="deal">Link Deal</Label>
              <Select
                value={createForm.relatedDealId}
                onValueChange={(val) => setCreateForm({ ...createForm, relatedDealId: val as string })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Select deal" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">None</SelectItem>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateDialog(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Saving..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
