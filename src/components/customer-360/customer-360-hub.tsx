"use client";

import React, { useState } from "react";
import { Customer360Data } from "@/app/actions/customer-360";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import {
  User,
  Building,
  Mail,
  Phone,
  DollarSign,
  Briefcase,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  Send,
  Printer,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  TrendingUp,
  Sparkles,
  Layers,
  Landmark,
  QrCode,
  Calendar,
  AlertTriangle,
  FolderGit2,
  CheckSquare,
} from "lucide-react";

interface Customer360HubProps {
  data: Customer360Data;
  onRefresh?: () => void;
}

export function Customer360Hub({ data, onRefresh }: Customer360HubProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "deals" | "invoices" | "projects" | "ai_health" | "custom_fields">("timeline");
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { contact, company, financials, timeline, deals, invoices, payments, quotes, projects, tasks, aiHealth } = data;

  const handleCopyPortal = () => {
    if (data.client?.portalToken) {
      const url = `${window.location.origin}/portal/${data.client.portalToken}`;
      navigator.clipboard.writeText(url);
      toast.success("Client Portal magic link copied to clipboard!");
    } else {
      toast.info("No active Client Portal token for this account.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Executive Cockpit */}
      <Card className="border-border/80 shadow-xs bg-linear-to-r from-card via-card to-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl border border-primary/20 shrink-0">
                {(contact.name || `${contact.firstName || "Contact"} ${contact.lastName || ""}`).slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    {contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact"}
                  </h1>
                  <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                    {contact.title || "Key Decision Maker"}
                  </Badge>
                  {company && (
                    <Badge variant="outline" className="text-xs font-normal">
                      <Building className="w-3 h-3 mr-1" />
                      {company.name}
                    </Badge>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      aiHealth.status === "thriving"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : aiHealth.status === "stable"
                        ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                        : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" /> Health: {aiHealth.healthScore}/100 ({aiHealth.status.toUpperCase()})
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-0.5">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-foreground">
                      <Mail className="w-3.5 h-3.5" /> {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-foreground">
                      <Phone className="w-3.5 h-3.5" /> {contact.phone}
                    </a>
                  )}
                  {contact.owner && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Rep: {contact.owner.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
              {contact.phone && (
                <a
                  href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="xs" variant="outline" className="text-xs gap-1.5 text-emerald-600 hover:bg-emerald-50">
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </Button>
                </a>
              )}

              {data.client?.portalToken && (
                <Button size="xs" variant="outline" onClick={handleCopyPortal} className="text-xs gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> Portal Link
                </Button>
              )}

              <Link href="/dashboard/quotes">
                <Button size="xs" variant="outline" className="text-xs gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> New Quote
                </Button>
              </Link>

              <Link href="/dashboard/invoices">
                <Button size="xs" className="text-xs font-semibold gap-1.5 shadow-xs">
                  <DollarSign className="w-3.5 h-3.5" /> New Invoice
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Financial 360 & Commercial Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Lifetime Invoiced (LTV)</span>
            <p className="text-xl font-bold mt-1 text-foreground">₹{financials.totalInvoiced.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{financials.invoiceCount} invoices generated</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Settled Payments</span>
            <p className="text-xl font-bold mt-1 text-emerald-600">₹{financials.totalPaid.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{financials.collectionRate}% collection rate</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Outstanding Balance</span>
            <p className={`text-xl font-bold mt-1 ${financials.totalOutstanding > 0 ? "text-rose-600" : "text-foreground"}`}>
              ₹{financials.totalOutstanding.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {financials.totalOutstanding > 0 ? "Receivable pending" : "All accounts clear"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Active Pipeline Value</span>
            <p className="text-xl font-bold mt-1 text-primary">₹{financials.activePipelineValue.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{financials.dealCount} commercial deals</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Subtabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "timeline"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> 360° Unified Timeline ({timeline.length})
        </button>

        <button
          onClick={() => setActiveTab("deals")}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "deals"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" /> Deals & Pipeline ({deals.length})
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "invoices"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" /> Invoices & Payments ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "projects"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" /> Projects & Deliverables ({projects.length})
        </button>

        <button
          onClick={() => setActiveTab("ai_health")}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "ai_health"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Relationship Intelligence
        </button>
      </div>

      {/* 4. Subtab Content Views */}

      {/* TAB 1: 360° UNIFIED TIMELINE */}
      {activeTab === "timeline" && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Unified 360° Touchpoint Feed</CardTitle>
            <CardDescription className="text-xs">
              Chronological log of all transactions, WhatsApp chats, quotations, payments, and internal notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {timeline.map((item) => (
                <div key={item.id} className="relative flex items-start gap-3 text-xs">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px]">
                    {item.type === "payment" && <DollarSign className="w-2.5 h-2.5 text-emerald-600" />}
                    {item.type === "invoice" && <FileText className="w-2.5 h-2.5 text-blue-600" />}
                    {item.type === "quote" && <Briefcase className="w-2.5 h-2.5 text-purple-600" />}
                    {item.type === "whatsapp" && <MessageSquare className="w-2.5 h-2.5 text-emerald-500" />}
                    {item.type === "email" && <Mail className="w-2.5 h-2.5 text-blue-500" />}
                    {item.type === "deal" && <TrendingUp className="w-2.5 h-2.5 text-amber-500" />}
                    {item.type === "note" && <CheckSquare className="w-2.5 h-2.5 text-slate-500" />}
                  </div>

                  <div className="flex-1 p-3 rounded-lg border border-border/60 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{item.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(item.timestamp).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}

              {timeline.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center">No recorded activity yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: DEALS & COMMERCIAL PIPELINE */}
      {activeTab === "deals" && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Deals & Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-3">Deal Title</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3 text-right">Value</th>
                    <th className="p-3">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deals.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/20">
                      <td className="p-3 font-semibold text-foreground">{d.title}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {d.stage}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        ₹{d.value?.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">{d.createdAt?.slice(0, 10)}</td>
                    </tr>
                  ))}
                  {deals.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No deals associated with this account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: INVOICES & PAYMENTS */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Tax Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-bold text-foreground">{inv.invoiceNumber}</td>
                        <td className="p-3 font-mono text-muted-foreground">{inv.dueDate}</td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          ₹{inv.amount?.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-600">
                          ₹{(inv.paidAmount || (inv.status === "paid" ? inv.amount : 0)).toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              inv.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : inv.status === "partially_paid"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {inv.status?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.status !== "paid" && (
                              <Button
                                size="xs"
                                onClick={() => {
                                  setSelectedInvoiceForPayment(inv);
                                  setShowPaymentModal(true);
                                }}
                                className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                              >
                                <DollarSign className="w-3 h-3" /> Record Pay
                              </Button>
                            )}
                            <Link href={`/dashboard/invoices/${inv.id}`} target="_blank">
                              <Button size="xs" variant="outline" className="h-6 text-[10px] gap-1">
                                <Printer className="w-3 h-3" /> Print
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                          No invoices generated for this client.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payment Receipts Table */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Settled Payment Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="p-3">Payment Date</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">Transaction ID / UTR</th>
                      <th className="p-3 text-right">Amount Settled</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono text-muted-foreground">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN") : "N/A"}
                        </td>
                        <td className="p-3 font-semibold uppercase">{p.paymentMode || "DIRECT"}</td>
                        <td className="p-3 font-mono text-foreground">{p.referenceNumber || "N/A"}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          ₹{p.amount?.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                            SETTLED
                          </span>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                          No payment receipts recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: PROJECTS & DELIVERABLES */}
      {activeTab === "projects" && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Client Projects & Deliverables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.map((prj) => (
              <div key={prj.id} className="p-4 rounded-lg border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{prj.name}</h4>
                    <p className="text-xs text-muted-foreground">{prj.description || "Project Onboarding & Milestone Track"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {prj.status}
                  </Badge>
                </div>

                {prj.deliverables && prj.deliverables.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                    <span className="font-semibold text-muted-foreground text-[11px] uppercase">Deliverables Checklist:</span>
                    {prj.deliverables.map((del: any) => (
                      <div key={del.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <span className="font-medium text-foreground">{del.title}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {del.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {projects.length === 0 && (
              <p className="text-xs text-muted-foreground py-6 text-center">No active projects for this account.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: AI RELATIONSHIP INTELLIGENCE */}
      {activeTab === "ai_health" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> AI Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              <p className="text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/60">
                {aiHealth.summary}
              </p>
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
                <span className="font-bold text-primary text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Next Best Action:
                </span>
                <p className="text-foreground text-xs leading-relaxed">{aiHealth.nextBestAction}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Health & Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-lg border border-border/60">
                <span className="font-medium text-foreground">Relationship Score</span>
                <span className="font-bold text-sm text-emerald-600">{aiHealth.healthScore} / 100</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg border border-border/60">
                <span className="font-medium text-foreground">Churn Risk Probability</span>
                <Badge variant="outline" className="uppercase font-bold text-xs">
                  {aiHealth.churnRisk}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg border border-border/60">
                <span className="font-medium text-foreground">Sentiment Arc</span>
                <Badge variant="outline" className="uppercase font-bold text-xs text-emerald-600">
                  {aiHealth.sentiment}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        invoice={selectedInvoiceForPayment}
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoiceForPayment(null);
        }}
        onPaymentRecorded={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}
