"use client";

import React, { useState } from "react";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Printer,
  Copy,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBusinessOsInvoice, updateInvoiceStatus } from "@/app/actions/business-os";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { EnterpriseBillEntryStudio } from "@/components/billing/enterprise-bill-entry-studio";
import { toast } from "sonner";
import Link from "next/link";

interface InvoicesClientProps {
  user: any;
  initialInvoices: any[];
}

export default function InvoicesClient({ user, initialInvoices }: InvoicesClientProps) {
  const [invoices, setInvoices] = useState(initialInvoices || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [entryMode, setEntryMode] = useState<"fiscal_studio" | "quick">("fiscal_studio");
  const [newForm, setNewForm] = useState({
    clientName: "",
    amount: "",
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: "unpaid" as "draft" | "unpaid" | "paid" | "overdue",
  });

  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const unpaidTotal = invoices
    .filter((i) => i.status === "unpaid" || i.status === "overdue")
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const collectionRate =
    invoices.length > 0
      ? Math.round(
          (invoices.filter((i) => i.status === "paid").length / invoices.length) * 100
        )
      : 100;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.clientName || !newForm.amount) return;

    setLoading(true);
    try {
      const created = await createBusinessOsInvoice({
        clientName: newForm.clientName.trim(),
        amount: Number(newForm.amount),
        dueDate: newForm.dueDate,
        status: newForm.status,
      });

      setInvoices([created, ...invoices]);
      setShowAdd(false);
      setNewForm({
        clientName: "",
        amount: "",
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: "unpaid",
      });
      toast.success(`Invoice ${created.invoiceNumber} created & linked to Client Portal!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    id: string,
    status: "draft" | "unpaid" | "paid" | "overdue"
  ) => {
    try {
      await updateInvoiceStatus(id, status);
      setInvoices(invoices.map((inv) => (inv.id === id ? { ...inv, status } : inv)));
      toast.success(`Invoice status updated to "${status}" and synced to client portal!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const handleCopyPortal = (portalToken?: string) => {
    if (!portalToken) {
      toast.error("No portal token generated for this client yet.");
      return;
    }
    const url = `${window.location.origin}/portal/${portalToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Client portal link copied to clipboard!");
  };

  const filtered = invoices.filter((inv) => {
    const q = (searchTerm || "").toLowerCase();
    const matchesSearch =
      !q ||
      (inv.invoiceNumber || "").toLowerCase().includes(q) ||
      (inv.client?.name || "").toLowerCase().includes(q) ||
      (inv.deal?.title || "").toLowerCase().includes(q);

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && inv.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Invoice Billings &amp; Client Portal Sync
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage client invoices, monitor accounts receivable, track due dates, and sync statements to the Client Portal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEntryMode("fiscal_studio");
              setShowAdd(true);
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
          >
            <Receipt className="w-4 h-4" />
            Issue Sovereign Bill / Invoice
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEntryMode("quick");
              setShowAdd(!showAdd);
            }}
            className="gap-1.5 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Quick Invoice
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 bg-card p-4">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
            <span>Total Invoiced</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground mt-2">
            ₹{totalInvoiced.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono mt-1 block">
            Across {invoices.length} invoices
          </span>
        </Card>

        <Card className="border border-border/80 bg-card p-4">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
            <span>Collected Revenue</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            ₹{paidTotal.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-emerald-600/80 font-mono mt-1 block">
            {collectionRate}% collection rate
          </span>
        </Card>

        <Card className="border border-border/80 bg-card p-4">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
            <span>Outstanding Balance</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            ₹{unpaidTotal.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono mt-1 block">
            Unpaid &amp; open statements
          </span>
        </Card>

        <Card className="border border-border/80 bg-card p-4">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
            <span>Overdue Accounts</span>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold font-mono text-destructive mt-2">
            {overdueCount} {overdueCount === 1 ? "invoice" : "invoices"}
          </p>
          <span className="text-[10px] text-destructive/80 font-mono mt-1 block">
            Requires automated nudge
          </span>
        </Card>
      </div>

      {/* Add Invoice Form / Enterprise Fiscal Studio */}
      {showAdd && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-muted/60 p-2 rounded-xl border border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase px-2 tracking-wider">
              {entryMode === "fiscal_studio" ? "🏢 Institutional Multi-Line Entry Mode" : "⚡ Quick Single-Line Invoice Mode"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant={entryMode === "fiscal_studio" ? "default" : "ghost"}
                onClick={() => setEntryMode("fiscal_studio")}
                className="text-xs font-semibold"
              >
                Fiscal Studio
              </Button>
              <Button
                size="xs"
                variant={entryMode === "quick" ? "default" : "ghost"}
                onClick={() => setEntryMode("quick")}
                className="text-xs font-semibold"
              >
                Quick Mode
              </Button>
            </div>
          </div>

          {entryMode === "fiscal_studio" ? (
            <EnterpriseBillEntryStudio
              onSuccess={(created) => {
                setInvoices([created, ...invoices]);
                setShowAdd(false);
              }}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <Card className="border-primary/20 bg-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Issue Quick Client Invoice</CardTitle>
                <CardDescription className="text-xs">
                  Generate an official billing statement. This will automatically provision or link to the customer&apos;s Client Portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-foreground">Client Name / Account</label>
                      <Input
                        required
                        placeholder="e.g. Apex Global Logistics"
                        value={newForm.clientName}
                        onChange={(e) => setNewForm({ ...newForm, clientName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Amount (INR)</label>
                      <Input
                        required
                        type="number"
                        min="1"
                        placeholder="e.g. 250000"
                        value={newForm.amount}
                        onChange={(e) => setNewForm({ ...newForm, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Due Date</label>
                      <Input
                        required
                        type="date"
                        value={newForm.dueDate}
                        onChange={(e) => setNewForm({ ...newForm, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={loading}>
                      {loading ? "Generating..." : "Issue & Sync to Portal"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, client, or deal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["all", "unpaid", "paid", "overdue", "draft"].map((st) => (
            <Button
              key={st}
              size="xs"
              variant={statusFilter === st ? "default" : "outline"}
              onClick={() => setStatusFilter(st)}
              className="text-xs capitalize h-7"
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Invoices List */}
      <Card className="border border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Client / Target</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-foreground">
                    {inv.invoiceNumber}
                  </td>
                  <td className="p-3.5">
                    <p className="font-semibold text-foreground">{inv.client?.name || "Client Account"}</p>
                    {inv.deal && (
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        Deal: {inv.deal.title}
                      </p>
                    )}
                  </td>
                  <td className="p-3.5 text-muted-foreground font-mono">
                    {inv.dueDate}
                  </td>
                  <td className="p-3.5 font-mono font-bold text-foreground">
                    <div>₹{inv.amount?.toLocaleString("en-IN")}</div>
                    {inv.paidAmount > 0 && inv.status !== "paid" && (
                      <div className="text-[10px] text-emerald-600 font-normal">
                        Paid: ₹{inv.paidAmount.toLocaleString("en-IN")}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : inv.status === "partially_paid"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          : inv.status === "overdue"
                          ? "bg-destructive/10 text-destructive border border-destructive/20 animate-pulse"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {inv.status === "partially_paid" ? "PARTIAL" : inv.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
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
                          <DollarSign className="w-3 h-3" />
                          Record Pay
                        </Button>
                      )}

                      {inv.status === "paid" && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleStatusUpdate(inv.id, "unpaid")}
                          className="h-6 text-[10px] text-muted-foreground hover:bg-muted"
                        >
                          Reopen
                        </Button>
                      )}

                      <Link href={`/dashboard/invoices/${inv.id}`} target="_blank">
                        <Button size="xs" variant="outline" className="h-6 text-[10px] gap-1">
                          <Printer className="w-3 h-3" />
                          Print
                        </Button>
                      </Link>

                      {inv.client?.portalToken && (
                        <>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleCopyPortal(inv.client.portalToken)}
                            className="h-6 text-[10px] gap-1 text-primary hover:bg-primary/10"
                            title="Copy Public Client Portal URL"
                          >
                            <Copy className="w-3 h-3" />
                            Portal Link
                          </Button>
                          <Link href={`/portal/${inv.client.portalToken}`} target="_blank">
                            <Button
                              size="xs"
                              variant="ghost"
                              className="h-6 text-[10px] gap-1 text-muted-foreground hover:bg-muted"
                              title="Open Portal View"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No invoices matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        invoice={selectedInvoiceForPayment}
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoiceForPayment(null);
        }}
        onPaymentRecorded={(result) => {
          setInvoices((prev) =>
            prev.map((i) => (i.id === result.updatedInvoice.id ? { ...i, ...result.updatedInvoice } : i))
          );
        }}
      />
    </div>
  );
}
