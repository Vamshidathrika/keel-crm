"use client";

import React, { useState } from "react";
import { MessageCircle, Search, Send, User, Check, CheckCheck, FileText, SendHorizontal, Play, Sparkles, Bell, Calendar, DollarSign, Settings2, ShieldCheck, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface WhatsappClientProps {
  user: any;
  contacts: any[];
  deals: any[];
}

const INITIAL_THREADS = [
  {
    id: "th-1",
    name: "Vamsi Krishna",
    phone: "+91 98480 22338",
    unread: 0,
    messages: [
      { sender: "client", text: "Hi, has the KYC document audit completed?", time: "10:30 AM" },
      { sender: "system", text: "🤖 Automated Update: Hello Vamsi, your KYC validation for 'PAN Card + Aadhaar' has been APPROVED by compliance. Welcome aboard!", time: "10:32 AM" },
      { sender: "agent", text: "Yes Vamsi, just verified it on our dashboard. You are good to go!", time: "10:35 AM" },
    ],
  },
  {
    id: "th-2",
    name: "Precision Auto Components",
    phone: "+91 94405 99011",
    unread: 1,
    messages: [
      { sender: "agent", text: "Here is the compiled CAD mold quote for your review.", time: "Yesterday" },
      { sender: "system", text: "🤖 Automated Quote Shared: CPQ Quote QTE-501 (Alloy Wheel molds x50) total amount ₹60,00,000 has been shared. Lead time: 4 weeks.", time: "Yesterday" },
      { sender: "client", text: "Thanks, looks good. We are passing it to our procurement team.", time: "Yesterday" },
    ],
  },
  {
    id: "th-3",
    name: "Harish Rao",
    phone: "+91 99080 11223",
    unread: 0,
    messages: [
      { sender: "client", text: "Can you send the invoice for my leather jacket order?", time: "Monday" },
      { sender: "system", text: "🤖 Automated Invoice: Order ORD-701 has been confirmed! Click here to download invoice: https://keel.crm/invoice/ORD-701", time: "Monday" },
      { sender: "agent", text: "Sent automatically via WhatsApp! Let me know if you need anything else.", time: "Monday" },
    ],
  },
];

export default function WhatsappClient({ user, contacts, deals }: WhatsappClientProps) {
  const [threads, setThreads] = useState(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState("th-1");
  const [typedMessage, setTypedMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Automation settings state
  const [autoFollowup, setAutoFollowup] = useState(true);
  const [autoInvoice, setAutoInvoice] = useState(true);
  const [autoQuote, setAutoQuote] = useState(true);
  const [autoShipment, setAutoShipment] = useState(true);

  // Manual trigger inputs
  const [selectedContact, setSelectedContact] = useState(contacts[0]?.id || "none");
  const [selectedTemplate, setSelectedTemplate] = useState("followup");
  const [customParams, setCustomParams] = useState({
    dealName: "Fleet Expansion",
    amount: "₹15,00,000",
    invoiceNo: "INV-2026-089",
    quoteNo: "QTE-801",
    eta: "2026-08-05",
  });

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || typedMessage;
    if (!text.trim()) return;

    const updated = threads.map((t) => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          messages: [
            ...t.messages,
            { sender: "agent", text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
          ],
        };
      }
      return t;
    });

    setThreads(updated);
    if (!textToSend) setTypedMessage("");

    // Simulate automatic client reply after 1.5 seconds
    setTimeout(() => {
      setThreads((currentThreads) =>
        currentThreads.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: [
                ...t.messages,
                {
                  sender: "client",
                  text: "Got it! Thanks for the update.",
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ],
            };
          }
          return t;
        })
      );
    }, 1500);
  };

  const handleTriggerAutomation = () => {
    const contactObj = contacts.find((c) => c.id === selectedContact) || contacts[0];
    const contactName = contactObj ? `${contactObj.firstName} ${contactObj.lastName || ""}` : "Client Contact";

    let text = "";
    if (selectedTemplate === "followup") {
      text = `🤖 Automated Follow-up: Hello ${contactName}, we noticed your deal for '${customParams.dealName}' is in progress. Do you have any questions about our pricing or timelines? Let us know!`;
    } else if (selectedTemplate === "invoice") {
      text = `🤖 Automated Invoice Sent: Hello ${contactName}, your order is approved. Please find your invoice (${customParams.invoiceNo}) for ${customParams.amount} here: https://keel.crm/invoices/${customParams.invoiceNo}`;
    } else if (selectedTemplate === "quote") {
      text = `🤖 Automated Quote Shared: Hello ${contactName}, here are the requested CPQ quote parameters for ${customParams.quoteNo} (${customParams.dealName}). Estimated TCV: ${customParams.amount}.`;
    } else if (selectedTemplate === "shipment") {
      text = `🤖 Automated Transit ETA: Hello ${contactName}, shipment ${customParams.quoteNo} is in transit. Current estimated arrival (ETA) is updated to ${customParams.eta}. Track here: https://keel.crm/track/${customParams.quoteNo}`;
    }

    // Check if thread with this name already exists or create new
    const existingThread = threads.find((t) => t.name === contactName);
    if (existingThread) {
      setThreads(
        threads.map((t) => {
          if (t.id === existingThread.id) {
            return {
              ...t,
              messages: [
                ...t.messages,
                { sender: "system", text, time: "Just Now" },
              ],
            };
          }
          return t;
        })
      );
      setActiveThreadId(existingThread.id);
    } else {
      const newThread = {
        id: `th-${Date.now()}`,
        name: contactName,
        phone: contactObj?.phone || "+91 90000 12345",
        unread: 0,
        messages: [{ sender: "system", text, time: "Just Now" }],
      };
      setThreads([...threads, newThread]);
      setActiveThreadId(newThread.id);
    }

    toast.success(`WhatsApp Automation trigger dispatched to ${contactName}!`);
  };

  const filteredThreads = threads.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-emerald-500 fill-emerald-500/10" /> WhatsApp Automation Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Core Integration — Manage conversational threads, configure triggered template automations, and broadcast billing receipts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Thread list - Col 1 */}
        <Card className="xl:col-span-1 border border-border bg-card flex flex-col h-[600px]">
          <CardHeader className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                className="pl-7 h-8 text-xs bg-muted/40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {filteredThreads.map((t) => {
              const lastMsg = t.messages[t.messages.length - 1];
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveThreadId(t.id);
                    t.unread = 0;
                  }}
                  className={`w-full text-left p-3.5 transition-colors flex items-center gap-3 ${
                    t.id === activeThreadId
                      ? "bg-primary/5 border-l-2 border-primary"
                      : "hover:bg-muted/10"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {t.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-foreground truncate">{t.name}</span>
                      <span className="text-[9px] text-muted-foreground">{lastMsg?.time || ""}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{lastMsg?.text || ""}</p>
                  </div>
                  {t.unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      {t.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Chat Thread Viewer - Col 2 & 3 */}
        <Card className="xl:col-span-2 border border-border bg-card flex flex-col h-[600px] overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
              {activeThread.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-foreground">{activeThread.name}</CardTitle>
              <CardDescription className="text-[9px] text-muted-foreground font-mono">{activeThread.phone}</CardDescription>
            </div>
          </CardHeader>

          {/* Chat Bubble Body */}
          <div className="flex-1 overflow-y-auto p-4 bg-muted/5 space-y-3">
            {activeThread.messages.map((msg, index) => {
              if (msg.sender === "system") {
                return (
                  <div key={index} className="flex justify-center">
                    <div className="max-w-[85%] rounded-xl px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-[10px] leading-relaxed text-center font-semibold">
                      {msg.text}
                      <span className="block text-[8px] text-emerald-600/70 mt-1 font-mono">{msg.time}</span>
                    </div>
                  </div>
                );
              }
              const isAgent = msg.sender === "agent";
              return (
                <div key={index} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-xl px-3 py-2 text-xs leading-normal shadow-sm border ${
                    isAgent
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border"
                  }`}>
                    <p>{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[8px] opacity-75 font-mono">
                      <span>{msg.time}</span>
                      {isAgent && <CheckCheck className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action templates shortcut */}
          <div className="px-4 py-2 border-t border-border bg-muted/10 flex gap-2 overflow-x-auto text-[10px]">
            <span className="text-muted-foreground self-center shrink-0 font-semibold">Share:</span>
            <button
              onClick={() => handleSendMessage(`📄 invoice details: Click link to view INV-1108 total ₹24,000`)}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted border border-border cursor-pointer shrink-0 font-medium"
            >
              💵 Send Invoice Link
            </button>
            <button
              onClick={() => handleSendMessage(`📄 quote details: CPQ mold estimate QTE-901 total ₹4,50,000`)}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted border border-border cursor-pointer shrink-0 font-medium"
            >
              🏭 Share BOM Quote
            </button>
            <button
              onClick={() => handleSendMessage(`🚛 ETA status update: Cargo cargo is loaded, expected departure tomorrow`)}
              className="px-2.5 py-1 rounded bg-card hover:bg-muted border border-border cursor-pointer shrink-0 font-medium"
            >
              📦 Update Transit ETA
            </button>
          </div>

          {/* Chat Message Input */}
          <div className="p-3 border-t border-border flex items-center gap-2">
            <Input
              placeholder="Type custom WhatsApp response..."
              className="flex-1 h-9 text-xs"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button
              size="sm"
              onClick={() => handleSendMessage()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* WhatsApp Automation Controller Panel - Col 4 */}
        <div className="xl:col-span-1 space-y-4">
          {/* Rules Configuration */}
          <Card className="border border-border bg-card">
            <CardHeader className="p-4 border-b border-border bg-muted/10">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-primary" /> Trigger Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Auto-Nudge stuck deals</p>
                  <p className="text-[9px] text-muted-foreground">Follow-up if in same stage &gt; 3 days</p>
                </div>
                <button
                  onClick={() => setAutoFollowup(!autoFollowup)}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors ${autoFollowup ? "bg-emerald-500" : "bg-border"}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${autoFollowup ? "translate-x-3.5" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Auto-Invoice Won deals</p>
                  <p className="text-[9px] text-muted-foreground">Send receipt when deal is Won</p>
                </div>
                <button
                  onClick={() => setAutoInvoice(!autoInvoice)}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors ${autoInvoice ? "bg-emerald-500" : "bg-border"}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${autoInvoice ? "translate-x-3.5" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Auto-Share CPQ Quote</p>
                  <p className="text-[9px] text-muted-foreground">Share BOM when compiled</p>
                </div>
                <button
                  onClick={() => setAutoQuote(!autoQuote)}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors ${autoQuote ? "bg-emerald-500" : "bg-border"}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${autoQuote ? "translate-x-3.5" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Auto-Update Transit ETAs</p>
                  <p className="text-[9px] text-muted-foreground">Alert client on shipping changes</p>
                </div>
                <button
                  onClick={() => setAutoShipment(!autoShipment)}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors ${autoShipment ? "bg-emerald-500" : "bg-border"}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${autoShipment ? "translate-x-3.5" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Test Automation Dispatcher */}
          <Card className="border border-border bg-card">
            <CardHeader className="p-4 border-b border-border bg-muted/10">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-ai">
                <Sparkles className="w-4 h-4 text-ai" /> Test Automation Runner
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">Recipient Client</label>
                <select
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                  className="w-full h-8 rounded border border-border bg-card px-2 text-[11px]"
                >
                  <option value="none">Select lead...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName || ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">Automation Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full h-8 rounded border border-border bg-card px-2 text-[11px]"
                >
                  <option value="followup">💬 Auto Deal Follow-up</option>
                  <option value="invoice">💵 Won Deal Invoice Link</option>
                  <option value="quote">🏭 CPQ Quote BOM details</option>
                  <option value="shipment">📦 Dispatch Transit status</option>
                </select>
              </div>

              {/* Param Inputs */}
              <div className="space-y-2 border-t border-border pt-2.5">
                {selectedTemplate === "followup" && (
                  <div className="space-y-1">
                    <label className="text-[9px] text-muted-foreground">Deal Title</label>
                    <Input
                      className="h-7 text-[10px]"
                      value={customParams.dealName}
                      onChange={(e) => setCustomParams({ ...customParams, dealName: e.target.value })}
                    />
                  </div>
                )}

                {selectedTemplate === "invoice" && (
                  <div className="grid grid-cols-2 gap-1">
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted-foreground">Invoice No</label>
                      <Input
                        className="h-7 text-[10px]"
                        value={customParams.invoiceNo}
                        onChange={(e) => setCustomParams({ ...customParams, invoiceNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted-foreground">Amount</label>
                      <Input
                        className="h-7 text-[10px]"
                        value={customParams.amount}
                        onChange={(e) => setCustomParams({ ...customParams, amount: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {selectedTemplate === "quote" && (
                  <div className="grid grid-cols-2 gap-1">
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted-foreground">Quote SKU</label>
                      <Input
                        className="h-7 text-[10px]"
                        value={customParams.quoteNo}
                        onChange={(e) => setCustomParams({ ...customParams, quoteNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted-foreground">Fee</label>
                      <Input
                        className="h-7 text-[10px]"
                        value={customParams.amount}
                        onChange={(e) => setCustomParams({ ...customParams, amount: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {selectedTemplate === "shipment" && (
                  <div className="grid grid-cols-2 gap-1">
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted-foreground">Tracking ID</label>
                      <Input
                        className="h-7 text-[10px]"
                        value={customParams.quoteNo}
                        onChange={(e) => setCustomParams({ ...customParams, quoteNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-muted-foreground">Arrival ETA</label>
                      <Input
                        type="date"
                        className="h-7 text-[10px]"
                        value={customParams.eta}
                        onChange={(e) => setCustomParams({ ...customParams, eta: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                size="sm"
                disabled={selectedContact === "none"}
                onClick={handleTriggerAutomation}
                className="w-full bg-ai hover:bg-ai/90 text-ai-foreground flex items-center justify-center gap-1.5 border border-ai/20 mt-2"
              >
                <Play className="w-3.5 h-3.5" /> Execute Test Trigger
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
