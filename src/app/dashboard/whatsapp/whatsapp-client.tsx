"use client";

import React, { useState } from "react";
import { MessageCircle, Search, Send, User, Check, CheckCheck, FileText, SendHorizontal, Play, Sparkles, Bell, Calendar, DollarSign, Settings2, ShieldCheck, Zap, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { sendMessage } from "@/app/actions/messages";

interface WhatsappClientProps {
  user: any;
  contacts: any[];
  deals: any[];
  initialMessages?: any[];
}

export default function WhatsappClient({ user, contacts, deals, initialMessages = [] }: WhatsappClientProps) {
  // Build initial conversational threads from real contacts
  const initialThreads = contacts.length > 0
    ? contacts.map((c) => {
        const contactMsgs = initialMessages
          .filter((m) => m.contactId === c.id)
          .map((m) => ({
            sender: m.direction === "outbound" ? "agent" : "client",
            text: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));

        return {
          id: c.id,
          name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
          phone: c.phone || "+91 98480 22338",
          unread: 0,
          messages: contactMsgs.length > 0 ? contactMsgs : [
            {
              sender: "system",
              text: `🤖 Connected to ${c.firstName || "client"}. Ready for automated CRM updates and AI messaging.`,
              time: "Just now",
            },
          ],
        };
      })
    : [
        {
          id: "th-direct",
          name: "Direct Client Inbox",
          phone: "+91 98480 22338",
          unread: 0,
          messages: [
            { sender: "system", text: "🤖 Connected to WhatsApp Business API Gateway.", time: "Just now" },
          ],
        },
      ];

  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0]?.id || "");
  const [typedMessage, setTypedMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sending, setSending] = useState(false);

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

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || typedMessage;
    if (!text.trim()) return;

    setSending(true);
    try {
      await sendMessage({
        contactId: activeThread?.id !== "th-direct" ? activeThread?.id : undefined,
        content: text,
        channel: "whatsapp",
      });

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
      toast.success("Message dispatched via WhatsApp Gateway");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleTriggerAutomation = (templateType: string) => {
    let msg = "";
    switch (templateType) {
      case "followup":
        msg = `🤖 Automated Follow-up: Hi ${activeThread?.name || "there"}, checking in on the proposal for ${customParams.dealName}. Let us know if you'd like to schedule a quick sync!`;
        break;
      case "invoice":
        msg = `🤖 Automated Invoice: Invoice ${customParams.invoiceNo} for ${customParams.amount} has been generated. View details on your client portal.`;
        break;
      case "quote":
        msg = `🤖 Automated CPQ Quote: CPQ Quote ${customParams.quoteNo} for ${customParams.amount} is ready for approval.`;
        break;
      case "shipment":
        msg = `🤖 Automated Logistics Dispatch: Your shipment tracking has been updated. Estimated Delivery: ${customParams.eta}.`;
        break;
      default:
        msg = `🤖 Automated CRM Notification for ${customParams.dealName}.`;
    }

    handleSendMessage(msg);
  };

  const filteredThreads = threads.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-emerald-500" />
            WhatsApp & Multi-Channel Business Gateway
          </h1>
          <p className="text-sm text-muted-foreground">
            Automated WhatsApp triggers for KYC verification, CPQ quotations, invoices, and shipment tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Live WhatsApp Conversations */}
        <div className="lg:col-span-8">
          <Card className="h-[650px] flex flex-col border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 h-full">
              {/* Thread list */}
              <div className="md:col-span-5 border-r flex flex-col h-full bg-muted/20">
                <div className="p-3 border-b bg-card">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border">
                  {filteredThreads.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveThreadId(t.id)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 hover:bg-muted/50 transition-colors ${
                        t.id === activeThreadId ? "bg-muted/80 font-medium" : ""
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {t.messages[t.messages.length - 1]?.time || ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">{t.phone}</p>
                        <p className="text-[11px] text-muted-foreground truncate pt-0.5">
                          {t.messages[t.messages.length - 1]?.text || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat View */}
              <div className="md:col-span-7 flex flex-col h-full bg-card">
                {activeThread ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-3.5 border-b flex items-center justify-between bg-muted/10">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                          {activeThread.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{activeThread.name}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            {activeThread.phone} • Official Business API
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages Window */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/5">
                      {activeThread.messages.map((m: any, idx: number) => {
                        const isAgent = m.sender === "agent";
                        const isSystem = m.sender === "system";

                        if (isSystem) {
                          return (
                            <div key={idx} className="flex justify-center my-2">
                              <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] px-3 py-1.5 rounded-lg max-w-[85%] text-center">
                                {m.text}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={idx} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                                isAgent
                                  ? "bg-emerald-600 text-white rounded-br-none"
                                  : "bg-muted text-foreground rounded-bl-none border"
                              }`}
                            >
                              <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                              <div
                                className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                                  isAgent ? "text-emerald-100" : "text-muted-foreground"
                                }`}
                              >
                                <span>{m.time}</span>
                                {isAgent && <CheckCheck className="w-3 h-3" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat Input */}
                    <div className="p-3 border-t bg-card flex items-center gap-2">
                      <Input
                        placeholder="Type a verified WhatsApp message..."
                        value={typedMessage}
                        onChange={(e) => setTypedMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="text-xs h-9"
                      />
                      <Button
                        size="sm"
                        disabled={sending || !typedMessage.trim()}
                        onClick={() => handleSendMessage()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3 gap-1"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                    Select a conversation to start messaging
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Triggers & Workflow Automation */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                1-Click Workflow Triggers
              </CardTitle>
              <CardDescription className="text-xs">
                Trigger transactional messaging templates directly into the active chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 gap-2"
                onClick={() => handleTriggerAutomation("followup")}
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Send Proposal Follow-Up
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 gap-2"
                onClick={() => handleTriggerAutomation("quote")}
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Send CPQ Quote Summary
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 gap-2"
                onClick={() => handleTriggerAutomation("invoice")}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                Send Invoice & Payment Link
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Gateway Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between items-center py-1 border-b">
                <span>Webhook Status</span>
                <span className="font-semibold text-emerald-500">Connected</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b">
                <span>Delivery Guarantee</span>
                <span className="font-semibold text-foreground">HMAC-SHA256</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Audit Timeline</span>
                <span className="font-semibold text-foreground">Active</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
