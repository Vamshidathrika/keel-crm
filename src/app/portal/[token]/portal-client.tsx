"use client";

import React, { useState } from "react";
import { MessageSquare, Send, CheckCircle2, AlertTriangle, FileText, Download, Check, RefreshCw, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";

interface PortalClientProps {
  client: any;
  branding: any;
  orgName: string;
  projects: any[];
  invoices: any[];
  quotes: any[];
  initialMessages: any[];
}

export default function PortalClient({
  client,
  branding,
  orgName,
  projects,
  invoices,
  quotes,
  initialMessages,
}: PortalClientProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [typedMsg, setTypedMsg] = useState("");
  const [localProjects, setLocalProjects] = useState(projects);
  const [localInvoices, setLocalInvoices] = useState(invoices);
  const [localQuotes, setLocalQuotes] = useState(quotes);

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const { acceptQuoteByPortal } = await import("@/app/actions/portal");
      await acceptQuoteByPortal(client.portalToken, quoteId, client.name);
      setLocalQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: "accepted" } : q))
      );
      toast.success("Quotation accepted & signed digitally!");
    } catch (err) {
      toast.error("Failed to accept quotation");
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      const { payInvoiceByPortal } = await import("@/app/actions/portal");
      await payInvoiceByPortal(client.portalToken, invoiceId);
      setLocalInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: "paid" } : inv))
      );
      toast.success("Payment recorded successfully!");
    } catch (err) {
      toast.error("Failed to process payment");
    }
  };

  const primaryColor = branding.primaryColor || "#2F5DFF";
  const appName = branding.appName || orgName;

  const handleSendMessage = async () => {
    if (!typedMsg.trim()) return;

    const userMsg = {
      id: `msg_local_${Date.now()}`,
      direction: "inbound",
      text: typedMsg,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const savedMsgText = typedMsg;
    setTypedMsg("");

    try {
      // Hit real portal messaging API endpoint
      const res = await fetch("/api/portal/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: client.portalToken,
          text: savedMsgText,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, data.reply]);
      }
      toast.success("Message delivered to partner timeline");
    } catch (err) {
      toast.error("Failed to sync message to server");
    }
  };

  const handleUpdateDeliverable = async (deliverableId: string, status: "approved" | "changes_requested") => {
    // Optimistic UI update
    const updated = localProjects.map((p) => {
      const updatedDelivs = p.deliverables.map((d: any) => {
        if (d.id === deliverableId) {
          return { ...d, status };
        }
        return d;
      });
      return { ...p, deliverables: updatedDelivs };
    });
    setLocalProjects(updated);

    try {
      const { updateDeliverableStatus } = await import("@/app/actions/portal");
      await updateDeliverableStatus(client.portalToken, deliverableId, status);
      toast.success(`Deliverable status updated to ${status.replace("_", " ")} and saved to database!`);
    } catch (err) {
      toast.error("Failed to update deliverable status on server");
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col font-sans">
      {/* Branding Header */}
      <header
        className="text-white px-6 py-4 flex items-center justify-between shadow-sm border-b"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-2.5">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={appName} className="h-8 max-w-[120px] object-contain" />
          ) : (
            <span className="text-lg font-bold tracking-tight">{appName} Portal</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full text-white">
            Client: {client.name}
          </div>
        </div>
      </header>

      {/* Portal Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle Workspace Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Projects Deliverables */}
          <Card className="border border-border bg-card">
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Project Milestones & Deliverables
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Review files, provide feedback, and sign off on active program deliverables.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              {localProjects.map((proj) => (
                <div key={proj.id} className="space-y-4">
                  <div className="border-b border-border/80 pb-2">
                    <h3 className="text-sm font-bold text-foreground">{proj.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5 capitalize">Status: {proj.status}</p>
                  </div>

                  <div className="grid gap-3">
                    {proj.deliverables?.map((d: any) => (
                      <div
                        key={d.id}
                        className="p-4 rounded-lg border border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground">{d.title}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{d.description}</p>
                        </div>
                        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.status === "approved" ? "bg-success/15 text-success" :
                            d.status === "changes_requested" ? "bg-destructive/15 text-destructive" :
                            "bg-ai/15 text-ai"
                          }`}>
                            {d.status.replace("_", " ")}
                          </span>

                          {d.status === "pending_review" && (
                            <div className="flex gap-1.5">
                              <Button
                                size="xs"
                                onClick={() => handleUpdateDeliverable(d.id, "approved")}
                                className="bg-success hover:bg-success/90 text-white text-[10px] h-7 px-2.5"
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleUpdateDeliverable(d.id, "changes_requested")}
                                className="text-[10px] h-7 px-2.5 border-border hover:bg-muted"
                              >
                                Revise
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {proj.deliverables?.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">No deliverables listed for this project.</p>
                    )}
                  </div>
                </div>
              ))}

              {localProjects.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-8">No active projects assigned to your account.</p>
              )}
            </CardContent>
          </Card>

          {/* Billings & Proposals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Invoices */}
            <Card className="border border-border bg-card">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" /> Invoice Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {localInvoices.map((inv: any) => (
                  <div key={inv.id} className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-foreground">{inv.invoiceNumber}</p>
                        <div className="flex gap-2 items-center mt-0.5">
                          <span className="text-[9px] text-muted-foreground font-mono">Due: {inv.dueDate}</span>
                          <span className="text-muted-foreground/40 text-[9px]">|</span>
                          <a
                            href={`/portal/${client.portalToken}/invoices/${inv.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] text-primary hover:underline font-mono"
                          >
                            🖨️ Print
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground font-mono">₹{inv.amount.toLocaleString("en-IN")}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          inv.status === "paid" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                    {inv.status !== "paid" && (
                      <div className="flex justify-end pt-1">
                        <Button
                          size="xs"
                          onClick={() => handlePayInvoice(inv.id)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] h-6 px-2.5 font-semibold"
                        >
                          💳 Pay Now (₹{inv.amount.toLocaleString("en-IN")})
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {localInvoices.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No billing statements available.</p>
                )}
              </CardContent>
            </Card>

            {/* Quotations */}
            <Card className="border border-border bg-card">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" /> Shared Quotes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {localQuotes.map((qte: any) => (
                  <div key={qte.id} className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-foreground truncate max-w-[150px]">{qte.title}</p>
                        <div className="flex gap-2 items-center mt-0.5">
                          <span className="text-[9px] text-muted-foreground font-mono">Total Quote</span>
                          <span className="text-muted-foreground/40 text-[9px]">|</span>
                          <a
                            href={`/portal/${client.portalToken}/quotes/${qte.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] text-primary hover:underline font-mono"
                          >
                            🖨️ Print
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground font-mono">₹{qte.total.toLocaleString("en-IN")}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          qte.status === "accepted" ? "bg-success/15 text-success" : "bg-ai/15 text-ai"
                        }`}>
                          {qte.status}
                        </span>
                      </div>
                    </div>
                    {qte.status !== "accepted" && (
                      <div className="flex justify-end pt-1">
                        <Button
                          size="xs"
                          onClick={() => handleAcceptQuote(qte.id)}
                          className="bg-success hover:bg-success/90 text-white text-[10px] h-6 px-2.5 font-semibold"
                        >
                          ✍️ Accept & Sign Digitally
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {localQuotes.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No quotations shared.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Chat Panel - Col 1 */}
        <Card className="border border-border bg-card flex flex-col h-[500px] lg:h-[600px] overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-xs font-bold">Message the Team</CardTitle>
              <CardDescription className="text-[9px] text-muted-foreground">Direct feed to your account manager</CardDescription>
            </div>
          </CardHeader>

          {/* Messages body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
            {messages.map((m: any) => {
              const isClient = m.direction === "inbound" || m.sender === "client";
              return (
                <div key={m.id} className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-normal border shadow-sm ${
                    isClient
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border"
                  }`}>
                    <p>{m.text}</p>
                    <span className="block text-[8px] opacity-75 font-mono text-right mt-1">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message input */}
          <div className="p-3 border-t border-border flex items-center gap-2">
            <Input
              placeholder="Type your reply here..."
              className="flex-1 h-9 text-xs"
              value={typedMsg}
              onChange={(e) => setTypedMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              className="shrink-0 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>

      </main>
    </div>
  );
}
