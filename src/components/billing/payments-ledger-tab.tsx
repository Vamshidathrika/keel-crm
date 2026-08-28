"use client";

import React, { useState, useEffect } from "react";
import { getOrgPayments } from "@/app/actions/payments";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import {
  DollarSign,
  Search,
  RefreshCw,
  Printer,
  Landmark,
  QrCode,
  CreditCard,
  Banknote,
  FileCheck2,
  TrendingUp,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

export function PaymentsLedgerTab() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("all");

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await getOrgPayments();
      setPayments(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load payments ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const upiTotal = payments
    .filter((p) => p.paymentMode === "upi")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const bankTotal = payments
    .filter((p) => p.paymentMode === "bank_transfer" || p.paymentMode === "neft_rtgs")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const filtered = payments.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(term)) ||
      (p.invoice?.invoiceNumber && p.invoice.invoiceNumber.toLowerCase().includes(term)) ||
      (p.id && p.id.toLowerCase().includes(term));

    const matchesMode = modeFilter === "all" || p.paymentMode === modeFilter;
    return matchesSearch && matchesMode;
  });

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "upi":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <QrCode className="w-3 h-3" /> UPI
          </span>
        );
      case "bank_transfer":
      case "neft_rtgs":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Landmark className="w-3 h-3" /> NEFT/RTGS
          </span>
        );
      case "credit_card":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <CreditCard className="w-3 h-3" /> Card
          </span>
        );
      case "cheque":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <FileCheck2 className="w-3 h-3" /> Cheque
          </span>
        );
      case "cash":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20">
            <Banknote className="w-3 h-3" /> Cash
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
            {mode?.toUpperCase() || "DIRECT"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase">Total Payments Collected</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold mt-1 text-foreground">
              ₹{totalCollected.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Across {payments.length} verified settlements
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase">UPI Instant Settlements</span>
              <QrCode className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold mt-1 text-emerald-600">
              ₹{upiTotal.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Zero gateway fees via Direct UPI VPA
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase">Corporate Bank Transfers</span>
              <Landmark className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">
              ₹{bankTotal.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              NEFT / RTGS / IMPS wire transfers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search by UTR, invoice #, or ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["all", "upi", "bank_transfer", "credit_card", "cheque", "cash"].map((mode) => (
            <Button
              key={mode}
              size="xs"
              variant={modeFilter === mode ? "default" : "outline"}
              onClick={() => setModeFilter(mode)}
              className="text-xs capitalize h-7"
            >
              {mode === "all" ? "All Modes" : mode.replace("_", " ")}
            </Button>
          ))}
          <Button
            size="xs"
            variant="ghost"
            onClick={fetchPayments}
            className="h-7 w-7 p-0 text-muted-foreground"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Payments Table */}
      <Card className="border border-border/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5">Payment Date</th>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Payment Mode</th>
                <th className="p-3.5">Transaction ID / UTR</th>
                <th className="p-3.5 text-right">Amount Paid</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((pay) => (
                <tr key={pay.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3.5 font-mono text-muted-foreground">
                    {pay.paidAt ? new Date(pay.paidAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }) : "N/A"}
                  </td>
                  <td className="p-3.5 font-mono font-bold text-foreground">
                    <Link
                      href={`/dashboard/invoices/${pay.invoiceId}`}
                      className="hover:underline text-primary"
                    >
                      {pay.invoice?.invoiceNumber || pay.invoiceId}
                    </Link>
                  </td>
                  <td className="p-3.5">{getModeBadge(pay.paymentMode)}</td>
                  <td className="p-3.5 font-mono text-foreground font-medium">
                    {pay.referenceNumber || <span className="text-muted-foreground italic">None</span>}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-emerald-600 text-sm">
                    ₹{pay.amount?.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> SETTLED
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <Link href={`/dashboard/invoices/${pay.invoiceId}`} target="_blank">
                      <Button size="xs" variant="outline" className="h-6 text-[10px] gap-1">
                        <Printer className="w-3 h-3" /> View Invoice
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {loading ? "Loading payments ledger..." : "No recorded payments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
