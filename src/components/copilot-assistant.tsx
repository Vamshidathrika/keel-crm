"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Check, AlertCircle, Calendar, Mail, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTask } from "@/app/actions/tasks";
import { createActivity } from "@/app/actions/activities";
import { toast } from "sonner";

interface CopilotAssistantProps {
  user: any;
}

type Message = {
  role: "user" | "model";
  parts: { text: string }[];
  proposals?: any[];
};

export default function CopilotAssistant({ user }: CopilotAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      parts: [
        {
          text: `Hello ${user.name}! I am your Keel AI Copilot. Try asking me:
• "Find John in contacts"
• "What are the details of expansion deal?"
• "Create a task to email Jane next Monday"
• "Draft a fleet update email for contact John"`,
        },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [processedProposals, setProcessedProposals] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setLoading(true);

    const updatedHistory = [...messages, { role: "user" as const, parts: [{ text: userText }] }];
    setMessages(updatedHistory);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: updatedHistory.slice(-10), // Send last 10 messages for context
        }),
      });

      if (!res.ok) throw new Error("API Channel failed");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          parts: [{ text: data.text }],
          proposals: data.proposals || [],
        },
      ]);
    } catch (err) {
      toast.error("Failed to query AI copilot");
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          parts: [{ text: "Sorry, I encountered an error. Please try again." }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTask = async (proposalId: string, args: any) => {
    try {
      await createTask({
        title: args.title,
        description: args.description || "AI-generated copilot proposal task.",
        dueDate: args.dueDate,
        relatedContactId: args.contactId || undefined,
      });

      setProcessedProposals((prev) => ({ ...prev, [proposalId]: true }));
      toast.success("Task created and scheduled successfully!");
    } catch (err) {
      toast.error("Failed to create proposed task");
    }
  };

  const handleConfirmEmail = async (proposalId: string, args: any) => {
    try {
      // Log email draft activity in contact timeline
      await createActivity({
        type: "email",
        body: `Draft Follow-up Email:\nSubject: ${args.subject}\n\n${args.body}`,
        relatedContactId: args.contactId,
        metadata: {
          draftedEmailSubject: args.subject,
          draftedEmailBody: args.body,
        },
      });

      setProcessedProposals((prev) => ({ ...prev, [proposalId]: true }));
      toast.success("Email draft logged on contact timeline!");

      // Open mailto link
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(args.subject)}&body=${encodeURIComponent(args.body)}`;
      window.open(mailtoUrl, "_blank");
    } catch (err) {
      toast.error("Failed to log email draft");
    }
  };

  return (
    <>
      {/* Floating Gold Trigger Button with pulse glow */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-ai text-ai-foreground shadow-lg flex items-center justify-center border border-ai/20 hover:scale-105 transition-transform z-50 group pulse-ai-glow"
        title="Ask AI Copilot"
      >
        <Sparkles className="w-5 h-5 group-hover:animate-spin" />
      </button>

      {/* Pane Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-card/95 border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-250 backdrop-blur-md">
          {/* Header */}
          <div className="h-16 border-b border-border px-6 flex items-center justify-between bg-gradient-to-r from-ai/10 to-transparent">
            <div className="flex items-center gap-2 text-ai font-bold text-sm">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>AI CRM Copilot</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Chat Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 scrollbar-thin">
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] text-xs leading-relaxed whitespace-pre-line border transition-all ${
                      isUser
                        ? "bg-gradient-to-br from-primary to-primary/80 border-primary/20 text-primary-foreground shadow-xs rounded-2xl rounded-tr-none px-3.5 py-2.5"
                        : "glass-panel border-border/80 text-foreground shadow-2xs rounded-2xl rounded-tl-none px-3.5 py-2.5"
                    }`}
                  >
                    {msg.parts.map((p) => p.text).join("\n")}
                  </div>

                  {/* Proposals Cards */}
                  {!isUser && msg.proposals && msg.proposals.length > 0 && (
                    <div className="w-[85%] space-y-2 mt-1">
                      {msg.proposals.map((prop, idx) => {
                        const propId = `${i}-${idx}`;
                        const isProcessed = processedProposals[propId];

                        if (prop.type === "create_task") {
                          return (
                            <div
                              key={idx}
                              className="p-3.5 border border-border/80 bg-card rounded-lg text-xs space-y-2.5 hover:shadow-xs transition-shadow duration-200"
                            >
                              <div className="flex items-center gap-1.5 text-primary font-bold">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Task Proposal</span>
                              </div>
                              <p className="font-semibold text-[11px] text-foreground">{prop.args.title}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">Due: {prop.args.dueDate}</p>
                              <Button
                                size="xs"
                                className="w-full text-[10px] h-7 cursor-pointer"
                                disabled={isProcessed}
                                onClick={() => handleConfirmTask(propId, prop.args)}
                              >
                                {isProcessed ? (
                                  <>
                                    <Check className="w-3 h-3 mr-1" /> Approved
                                  </>
                                ) : (
                                  "Confirm & Create Task"
                                )}
                              </Button>
                            </div>
                          );
                        }

                        if (prop.type === "draft_email") {
                          return (
                            <div
                              key={idx}
                              className="p-3.5 border border-border/80 bg-card rounded-lg text-xs space-y-2.5 hover:shadow-xs transition-shadow duration-200"
                            >
                              <div className="flex items-center gap-1.5 text-ai font-bold">
                                <Mail className="w-3.5 h-3.5 text-ai" />
                                <span>Email Draft Proposal</span>
                              </div>
                              <div className="bg-muted/40 p-2 rounded border border-border/50 max-h-24 overflow-y-auto space-y-1 scrollbar-thin">
                                <p className="font-bold text-[10px] text-foreground">Subject: {prop.args.subject}</p>
                                <p className="text-[10px] text-muted-foreground whitespace-pre-wrap">{prop.args.body}</p>
                              </div>
                              <Button
                                size="xs"
                                className="w-full text-[10px] h-7 bg-ai hover:bg-ai/90 text-ai-foreground cursor-pointer"
                                disabled={isProcessed}
                                onClick={() => handleConfirmEmail(propId, prop.args)}
                              >
                                {isProcessed ? (
                                  <>
                                    <Check className="w-3 h-3 mr-1" /> Draft Logged
                                  </>
                                ) : (
                                  "Confirm Draft & Send"
                                )}
                              </Button>
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-2xl bg-muted/20 border border-border/40 w-fit">
                <div className="loading-dots flex items-center h-4 shrink-0">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span>Copilot is scanning CRM ledger...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Footer Input Form */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-border bg-card/50 flex gap-2 backdrop-blur-xs"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask copilot..."
              disabled={loading}
              className="flex-1 text-xs bg-background"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="rounded-lg cursor-pointer">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
