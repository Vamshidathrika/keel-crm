"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  TrendingUp,
  MessageCircle,
  Clock,
  Send,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Plus,
  Copy,
  FolderKanban,
  CheckCheck,
  RefreshCw,
  PlusCircle,
  Inbox,
  Workflow,
  ClipboardList
} from "lucide-react";
import { toast } from "sonner";
import { convertDealToClientProject, createBusinessOsProposal, createBusinessOsInvoice } from "@/app/actions/business-os";

interface BusinessOsClientProps {
  user: any;
  initialClients: any[];
  initialQuotations: any[];
  initialInvoices: any[];
  initialPayments: any[];
  initialMessages: any[];
  initialFollowups: any[];
  initialProjects: any[];
  deals: any[];
  team: any[];
}

export default function BusinessOsClient({
  user,
  initialClients,
  initialQuotations,
  initialInvoices,
  initialPayments,
  initialMessages,
  initialFollowups,
  initialProjects,
  deals,
  team,
}: BusinessOsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "sales";

  const [clientsState, setClientsState] = useState(initialClients);
  const [quotationsState, setQuotationsState] = useState(initialQuotations);
  const [invoicesState, setInvoicesState] = useState(initialInvoices);
  const [paymentsState, setPaymentsState] = useState(initialPayments);
  const [messagesState, setMessagesState] = useState(initialMessages);
  const [followupsState, setFollowupsState] = useState(initialFollowups);
  const [projectsState, setProjectsState] = useState(initialProjects);

  // Active chat thread inside Inbox
  const [activeClientId, setActiveClientId] = useState<string | null>(initialClients[0]?.id || null);
  const [replyText, setReplyText] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [followupLoading, setFollowupLoading] = useState(false);

  // New quote form
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    dealId: deals[0]?.id || "",
    clientId: initialClients[0]?.id || "",
    title: "",
    items: [{ name: "Standard License", qty: 1, price: 50000 }],
  });
  const [aiProposalLoading, setAiProposalLoading] = useState(false);

  // Convert deal state
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [selectedWonDealId, setSelectedWonDealId] = useState("");

  // Insights AI state
  const [insightsNarrative, setInsightsNarrative] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Load KPI totals
  const totalRevenue = invoicesState
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const activeProjectsCount = projectsState.filter((p) => p.status === "active").length;
  const overdueInvoicesTotal = invoicesState
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);
  const collectionsRate = invoicesState.length
    ? Math.round((invoicesState.filter((i) => i.status === "paid").length / invoicesState.length) * 100)
    : 100;

  // Active client details
  const activeClient = clientsState.find((c) => c.id === activeClientId) || clientsState[0];
  const activeChatMessages = messagesState.filter((m) => m.clientId === activeClientId);

  const handleTabChange = (val: string) => {
    router.push(`/dashboard/business-os?tab=${val}`);
  };

  // AI Summarize Chat Thread
  const handleAiSummarize = async () => {
    if (!activeClientId) return;
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: activeChatMessages }),
      });
      const data = await res.json();
      setAiSummary(data.summary);
    } catch (err) {
      toast.error("Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  // AI Suggest Follow-up message
  const handleAiSuggestFollowup = async () => {
    if (!activeClientId) return;
    setFollowupLoading(true);
    try {
      const lastMsg = activeChatMessages[activeChatMessages.length - 1]?.text || "";
      const res = await fetch("/api/ai/suggest-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealName: activeClient?.name || "Active Contract",
          clientName: activeClient?.name,
          lastMessage: lastMsg,
        }),
      });
      const data = await res.json();
      setAiSuggestion(data.suggestion);
    } catch (err) {
      toast.error("Failed to suggest follow-up");
    } finally {
      setFollowupLoading(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!replyText.trim() || !activeClientId) return;

    const userMsg = {
      id: `msg_${Date.now()}`,
      clientId: activeClientId,
      direction: "outbound",
      type: "whatsapp",
      text: replyText,
      createdAt: new Date().toISOString(),
    };

    setMessagesState((prev) => [userMsg, ...prev]);
    const messageBody = replyText;
    setReplyText("");

    try {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: activeClientId,
          contactId: activeClient?.contactId,
          type: "whatsapp",
          text: messageBody,
        }),
      });
    } catch (err) {
      toast.error("Failed to broadcast message");
    }
  };

  // AI Draft Proposal items
  const handleAiDraftProposal = async () => {
    setAiProposalLoading(true);
    try {
      const matchedDeal = deals.find((d) => d.id === quoteForm.dealId);
      const res = await fetch("/api/ai/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealName: matchedDeal?.title || "Custom Services Upgrade",
          clientName: activeClient?.name,
          industry: "saas",
        }),
      });
      const data = await res.json();
      setQuoteForm({
        ...quoteForm,
        items: data.items,
      });
      toast.success("AI quotation proposal line items drafted!");
    } catch (err) {
      toast.error("Failed to generate AI proposal line items");
    } finally {
      setAiProposalLoading(false);
    }
  };

  // Copy portal token URL
  const copyPortalLink = (token: string) => {
    const link = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Client portal link copied to clipboard!");
  };

  // Generate Insights analysis
  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/ai/business-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kpis: {
            revenue: `₹${totalRevenue.toLocaleString("en-IN")}`,
            pendingInvoices: overdueInvoicesTotal > 0 ? "1 overdue statement" : "0 overdue",
            activeProjects: activeProjectsCount,
          },
        }),
      });
      const data = await res.json();
      setInsightsNarrative(data.narrative);
    } catch (err) {
      toast.error("Failed to compile AI insights");
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          💼 Keel Enterprise Core OS™
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Unified command suite — Integrated enterprise quotations, statutory tax billing, white-labeled client portals, project deliverables, and autonomous AI insights.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-muted/60 backdrop-blur-xs border border-border/80 h-10 p-1 text-xs rounded-xl gap-1">
          <TabsTrigger value="sales" className="text-xs rounded-lg transition-all px-4 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">Sales & Invoices</TabsTrigger>
          <TabsTrigger value="inbox" className="text-xs rounded-lg transition-all px-4 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">Inbox & Followups</TabsTrigger>
          <TabsTrigger value="projects" className="text-xs rounded-lg transition-all px-4 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">Projects & Portal</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs rounded-lg transition-all px-4 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">AI Insights</TabsTrigger>
        </TabsList>

        {/* ─── Sales & Invoices ─── */}
        <TabsContent value="sales" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quotes list */}
            <Card className="lg:col-span-2 border border-border bg-card">
              <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" /> Active Proposals & Quotations
                  </CardTitle>
                </div>
                <Button size="xs" onClick={() => setShowQuoteForm(!showQuoteForm)}>
                  <Plus className="w-3 h-3 mr-1" /> New Proposal
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {showQuoteForm && (
                  <div className="p-4 border border-border bg-muted/15 rounded-lg space-y-3.5 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="font-bold text-foreground">Configure Quotation Proposal</span>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={handleAiDraftProposal}
                        className="text-ai bg-ai/5 border border-ai/10 text-[10px] h-6 flex items-center gap-1"
                        disabled={aiProposalLoading}
                      >
                        <Sparkles className="w-3 h-3" /> {aiProposalLoading ? "Drafting..." : "AI Auto-Draft proposal"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Associated Opportunity Deal</Label>
                        <select
                          className="w-full h-8 rounded border border-border bg-card px-2"
                          value={quoteForm.dealId}
                          onChange={(e) => setQuoteForm({ ...quoteForm, dealId: e.target.value })}
                        >
                          {deals.map((d) => (
                            <option key={d.id} value={d.id}>{d.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Client Account Target</Label>
                        <select
                          className="w-full h-8 rounded border border-border bg-card px-2"
                          value={quoteForm.clientId}
                          onChange={(e) => setQuoteForm({ ...quoteForm, clientId: e.target.value })}
                        >
                          {clientsState.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px]">Quotation Items</Label>
                      {quoteForm.items.map((it, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder="Line item description"
                            className="h-8 text-xs flex-1"
                            value={it.name}
                            onChange={(e) => {
                              const newItems = [...quoteForm.items];
                              newItems[idx].name = e.target.value;
                              setQuoteForm({ ...quoteForm, items: newItems });
                            }}
                          />
                          <Input
                            placeholder="Qty"
                            type="number"
                            className="h-8 text-xs w-16"
                            value={it.qty}
                            onChange={(e) => {
                              const newItems = [...quoteForm.items];
                              newItems[idx].qty = Number(e.target.value);
                              setQuoteForm({ ...quoteForm, items: newItems });
                            }}
                          />
                          <Input
                            placeholder="Cost"
                            type="number"
                            className="h-8 text-xs w-24"
                            value={it.price}
                            onChange={(e) => {
                              const newItems = [...quoteForm.items];
                              newItems[idx].price = Number(e.target.value);
                              setQuoteForm({ ...quoteForm, items: newItems });
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-1.5 pt-2">
                      <Button size="xs" variant="ghost" onClick={() => setShowQuoteForm(false)}>Cancel</Button>
                      <Button size="xs" onClick={async () => {
                        const matchedDeal = deals.find((d) => d.id === quoteForm.dealId);
                        if (!activeClient) return;

                        try {
                          const createdQuote = await createBusinessOsProposal({
                            clientId: activeClient.id,
                            dealId: quoteForm.dealId !== "none" ? quoteForm.dealId : undefined,
                            title: matchedDeal?.title || "Custom Proposal Quote",
                            items: quoteForm.items,
                          });
                          setQuotationsState([createdQuote, ...quotationsState]);
                          setShowQuoteForm(false);
                          toast.success("Quotation generated & saved to database successfully!");
                        } catch (err) {
                          toast.error("Failed to generate quote");
                        }
                      }}>Publish & Share Proposal</Button>
                    </div>
                  </div>
                )}

                {quotationsState.map((q) => (
                  <div key={q.id} className="p-3 border border-border bg-card rounded-lg flex items-center justify-between text-xs hover:shadow-sm">
                    <div>
                      <p className="font-semibold text-foreground">{q.title}</p>
                      <div className="flex gap-2 items-center mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Target: {q.client?.name || "Client"}
                        </span>
                        <span className="text-muted-foreground/40 text-[10px]">|</span>
                        <Button
                          size="xs"
                          variant="link"
                          onClick={() => router.push(`/dashboard/quotes/${q.id}`)}
                          className="text-[10px] h-auto p-0 text-primary hover:underline font-mono"
                        >
                          🖨️ Print
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-foreground">₹{q.total.toLocaleString("en-IN")}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.status === "accepted" ? "bg-success/10 text-success border border-success/20" : "bg-ai/10 text-ai border border-ai/20"
                      }`}>
                        {q.status}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Invoices panel */}
            <Card className="border border-border bg-card">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-primary" /> Invoice Billings & Receipts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {invoicesState.map((inv) => (
                  <div key={inv.id} className="p-3 border border-border bg-muted/10 rounded-lg space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-foreground">{inv.invoiceNumber}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Due: {inv.dueDate}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                        inv.status === "paid" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive animate-pulse"
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border/40 font-mono">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                        className="text-[10px] h-6 px-2 border border-border/60 bg-background hover:bg-muted font-sans font-medium"
                      >
                        🖨️ View/Print
                      </Button>
                      <span className="font-bold">₹{inv.amount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Inbox & Followups ─── */}
        <TabsContent value="inbox" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* Thread feed */}
            <Card className="xl:col-span-1 border border-border bg-card flex flex-col h-[550px] overflow-hidden">
              <CardHeader className="p-4 border-b border-border bg-muted/10">
                <CardTitle className="text-xs font-bold flex items-center gap-1">
                  <Inbox className="w-4 h-4 text-muted-foreground" /> Client Inbox Chats
                </CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                {clientsState.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveClientId(c.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-center gap-2.5 ${
                      c.id === activeClientId ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-muted/10"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs">
                      {c.name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{c.email || c.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Conversation view */}
            <Card className="xl:col-span-2 border border-border bg-card flex flex-col h-[550px] overflow-hidden">
              <CardHeader className="p-4 border-b border-border bg-muted/15 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-xs font-bold text-foreground">{activeClient?.name || "Client Feed"}</CardTitle>
                  <CardDescription className="text-[9px] text-muted-foreground">{activeClient?.phone || "Simulated Chat Channel"}</CardDescription>
                </div>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={handleAiSummarize}
                  disabled={summaryLoading}
                  className="text-ai bg-ai/5 border border-ai/10 text-[10px] h-6 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> {summaryLoading ? "Summarizing..." : "AI Summarize Thread"}
                </Button>
              </CardHeader>

              {/* Chat bubbles */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-muted/5">
                {aiSummary && (
                  <div className="p-3 bg-ai/5 border border-ai/20 rounded-xl space-y-1 text-xs">
                    <p className="font-semibold text-ai flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI Conversation Summary
                    </p>
                    <p className="text-[10px] text-muted-foreground whitespace-pre-line leading-relaxed">{aiSummary}</p>
                  </div>
                )}

                {activeChatMessages.map((m) => {
                  const isClient = m.direction === "inbound";
                  return (
                    <div key={m.id} className={`flex ${isClient ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs leading-normal border shadow-sm ${
                        isClient ? "bg-card text-foreground border-border" : "bg-primary text-primary-foreground border-primary"
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

              {/* Suggestions */}
              {aiSuggestion && (
                <div className="px-4 py-2 border-t border-border bg-ai/5 flex flex-col gap-1 text-[10px]">
                  <p className="text-ai font-semibold flex items-center gap-0.5">💡 Suggested Follow-up Draft</p>
                  <div className="flex gap-2 items-center">
                    <p className="text-muted-foreground flex-1 italic">&ldquo;{aiSuggestion}&rdquo;</p>
                    <Button size="xs" className="h-6 text-[9px]" onClick={() => {
                      setReplyText(aiSuggestion);
                      setAiSuggestion("");
                    }}>Insert Draft</Button>
                  </div>
                </div>
              )}

              {/* Message inputs */}
              <div className="p-3 border-t border-border flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAiSuggestFollowup}
                  disabled={followupLoading}
                  className="h-9 px-2.5 border-border hover:bg-muted shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-ai" />
                </Button>
                <Input
                  placeholder="Type WhatsApp/Email response..."
                  className="flex-1 h-9 text-xs"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <Button size="sm" onClick={handleSendMessage} className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Followups panel */}
            <Card className="xl:col-span-1 border border-border bg-card flex flex-col h-[550px] overflow-hidden">
              <CardHeader className="p-4 border-b border-border bg-muted/10">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" /> Scheduled Followups
                </CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {followupsState.map((flw) => (
                  <div key={flw.id} className="p-3 border border-border bg-card rounded-lg space-y-2 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-foreground leading-snug">{flw.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        flw.status === "completed" ? "bg-success/15 text-success" :
                        flw.status === "overdue" ? "bg-destructive/15 text-destructive animate-pulse" :
                        "bg-ai/15 text-ai"
                      }`}>
                        {flw.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                      <span>Due: {flw.dueDate}</span>
                      <span>Target: {flw.contact?.firstName || "Lead"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Projects & Portal ─── */}
        <TabsContent value="projects" className="mt-4 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Active Project Delivery Accounts
            </h3>
            <Button size="xs" onClick={() => setShowConvertDialog(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Convert Won Deal
            </Button>
          </div>

          {showConvertDialog && (
            <Card className="border border-border bg-card p-4 space-y-3.5 text-xs max-w-lg">
              <p className="font-bold text-foreground">Convert Closed Won Opportunity</p>
              <div className="space-y-1">
                <Label className="text-[10px]">Select Won Deal Opportunity</Label>
                <select
                  value={selectedWonDealId}
                  onChange={(e) => setSelectedWonDealId(e.target.value)}
                  className="w-full h-8 rounded border border-border bg-card px-2"
                >
                  <option value="">Select a deal...</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>{d.title} (₹{d.value.toLocaleString("en-IN")})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-1.5 pt-2">
                <Button size="xs" variant="ghost" onClick={() => setShowConvertDialog(false)}>Cancel</Button>
                <Button size="xs" onClick={async () => {
                  const matchedDeal = deals.find((d) => d.id === selectedWonDealId);
                  if (!matchedDeal) return;

                  try {
                    const res = await convertDealToClientProject({
                      dealId: matchedDeal.id,
                      clientName: matchedDeal.title.replace("Deal", "Partner"),
                      budget: matchedDeal.value,
                    });
                    setClientsState([res.client, ...clientsState]);
                    setProjectsState([{ ...res.project, client: res.client, projectTasks: [], deliverables: [] }, ...projectsState]);
                    setShowConvertDialog(false);
                    toast.success("Deal converted! Client portal provisioned in SQLite.");
                  } catch (err) {
                    toast.error("Failed to convert deal");
                  }
                }}>Convert & Provision Portal</Button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {projectsState.map((proj) => (
              <Card key={proj.id} className="border border-border bg-card flex flex-col">
                <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground">{proj.name}</CardTitle>
                    <CardDescription className="text-[9px] text-muted-foreground mt-0.5">
                      Client Portal Token URL active
                    </CardDescription>
                  </div>
                  {proj.client?.portalToken && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => copyPortalLink(proj.client.portalToken)}
                      className="h-7 w-7 p-0 border border-border bg-background hover:bg-muted"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-4 flex-1">
                  {/* Tasks */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <FolderKanban className="w-3.5 h-3.5" /> Project Tasks
                    </p>
                    <div className="space-y-1.5 text-xs">
                      {proj.projectTasks?.map((pt: any) => (
                        <div key={pt.id} className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border/60">
                          <span className="font-semibold truncate max-w-[150px]">{pt.title}</span>
                          <span className="font-mono text-[9px] bg-muted px-1.5 py-0.5 border rounded">
                            {pt.status}
                          </span>
                        </div>
                      ))}
                      {proj.projectTasks?.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic py-1">No tasks logged.</p>
                      )}
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Portal Deliverables
                    </p>
                    <div className="space-y-1.5 text-xs">
                      {proj.deliverables?.map((del: any) => (
                        <div key={del.id} className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border/60">
                          <span className="font-semibold truncate max-w-[150px]">{del.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            del.status === "approved" ? "bg-success/15 text-success" :
                            del.status === "changes_requested" ? "bg-destructive/15 text-destructive" :
                            "bg-ai/15 text-ai"
                          }`}>
                            {del.status.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                      {proj.deliverables?.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic py-1">No deliverables.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── AI Insights ─── */}
        <TabsContent value="insights" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground">Total Paid Revenue</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-foreground font-mono">₹{totalRevenue.toLocaleString("en-IN")}</p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground">Active Projects</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-foreground font-mono">{activeProjectsCount}</p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground">Overdue Statements</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-destructive font-mono">₹{overdueInvoicesTotal.toLocaleString("en-IN")}</p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground">Collections Rate</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-foreground font-mono">{collectionsRate}%</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border bg-card">
            <CardHeader className="p-4 border-b border-border flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-ai">
                  <Sparkles className="w-4 h-4 text-ai" /> AI Performance Analysis
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                  Analytical review paragraph of business KPI health
                </CardDescription>
              </div>
              <Button size="xs" onClick={handleGenerateInsights} disabled={insightsLoading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${insightsLoading ? "animate-spin" : ""}`} /> Compile Analysis
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {insightsNarrative ? (
                <p className="text-xs text-muted-foreground leading-relaxed p-4 rounded-xl border border-ai/20 bg-ai/5 italic">
                  &ldquo;{insightsNarrative}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-8">
                  Click &apos;Compile Analysis&apos; to run automated performance reviews.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
