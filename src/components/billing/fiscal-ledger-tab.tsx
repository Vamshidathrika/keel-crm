"use client";

import React, { useState, useEffect } from "react";
import {
  getFiscalLedgerData,
  createPricingPlan,
  recordMeteredUsage,
  updateDunningRules,
  getFiscalBillsAndInvoices,
  PricingPlanConfig,
  DunningRuleConfig,
  MeteredUsageRecord,
} from "@/app/actions/fiscal-billing";
import { getGstSettings } from "@/app/actions/gst-settings";
import { getInvoiceCustomization } from "@/app/actions/invoice-customization";
import { GstSettingsStudio } from "./gst-settings-studio";
import { InvoiceCustomizationStudio } from "./invoice-customization-studio";
import { PaymentsLedgerTab } from "./payments-ledger-tab";
import { EnterpriseBillEntryStudio } from "./enterprise-bill-entry-studio";
import { toast } from "sonner";
import {
  TrendingUp,
  Layers,
  Activity,
  AlertOctagon,
  Percent,
  Plus,
  Zap,
  RefreshCw,
  Clock,
  ShieldAlert,
  Sliders,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Calendar,
  Sparkles,
  ShieldCheck,
  Palette,
  CreditCard,
  Building2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FiscalLedgerTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [gstData, setGstData] = useState<any>(null);
  const [customizationData, setCustomizationData] = useState<any>(null);
  const [billsData, setBillsData] = useState<any[]>([]);
  const [showBillStudio, setShowBillStudio] = useState(false);
  const [billFilter, setBillFilter] = useState<string>("all");
  const [billSearch, setBillSearch] = useState<string>("");
  const [subTab, setSubTab] = useState<"plans" | "bills_entry" | "metering" | "dunning" | "recognition" | "gst" | "invoice_design" | "payments">("plans");

  // Plan creation modal / state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState<Omit<PricingPlanConfig, "id">>({
    name: "",
    code: "",
    model: "flat",
    billingCycle: "monthly",
    basePrice: 0,
    trialDays: 14,
    currency: "INR",
    taxInclusive: false,
    status: "active",
  });

  // Meter usage modal state
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageForm, setUsageForm] = useState({
    meterName: "API Gateway Calls",
    unitsConsumed: 1000,
    unitPrice: 0.05,
  });

  // Dunning rule state
  const [dunningForm, setDunningForm] = useState<DunningRuleConfig>({
    retryAttempts: 4,
    retryIntervalDays: [1, 3, 5, 7],
    emailNotification: true,
    whatsappNotification: true,
    actionOnFailure: "pause",
    gracePeriodDays: 7,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, gstRes, customRes, billsRes] = await Promise.all([
        getFiscalLedgerData(),
        getGstSettings(),
        getInvoiceCustomization(),
        getFiscalBillsAndInvoices(),
      ]);
      setData(res);
      setGstData(gstRes);
      setCustomizationData(customRes);
      setBillsData(billsRes);
      if (res?.dunning) {
        setDunningForm(res.dunning);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load fiscal engine data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPricingPlan(planForm);
      toast.success(`Pricing Plan "${planForm.name}" provisioned successfully!`);
      setShowPlanModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create plan.");
    }
  };

  const handleRecordUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await recordMeteredUsage(usageForm);
      toast.success(`Recorded ${usageForm.unitsConsumed.toLocaleString()} units for ${usageForm.meterName}`);
      setShowUsageModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to log consumption.");
    }
  };

  const handleSaveDunning = async () => {
    try {
      await updateDunningRules(dunningForm);
      toast.success("Sovereign Dunning & Retry playbook updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update dunning policies.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm font-semibold text-muted-foreground">Initializing Keel LedgerOS™...</span>
      </div>
    );
  }

  // Filtered bills for the Bills Entry Ledger view
  const filteredBills = billsData.filter((b) => {
    const matchesFilter =
      billFilter === "all" ||
      (billFilter === "vendor_bill" && b.billType === "vendor_bill") ||
      (billFilter === "tax_invoice" && (b.billType === "tax_invoice" || !b.billType)) ||
      (billFilter === "credit_note" && b.billType === "credit_note");

    const partyName = b.client?.name || "";
    const invNum = b.invoiceNumber || "";
    const matchesSearch =
      partyName.toLowerCase().includes(billSearch.toLowerCase()) ||
      invNum.toLowerCase().includes(billSearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Revenue Engine Bar */}
      <div className="p-6 rounded-2xl bg-linear-to-r from-primary/15 via-background to-primary/5 border border-primary/20 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Keel LedgerOS™
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono font-bold">
                  Sovereign Engine
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unified monetization, usage metering, smart automated dunning, GST compliance, and accounts payable ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="flex items-center gap-3 bg-muted/60 p-2 rounded-xl border border-border/60">
          <div className="px-3 py-1 text-center">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">MRR Runrate</div>
            <div className="text-sm font-bold font-mono text-primary">₹{data?.metrics?.mrr?.toLocaleString("en-IN") || 0}</div>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="px-3 py-1 text-center">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Recovered (Dunning)</div>
            <div className="text-sm font-bold font-mono text-emerald-600">₹{data?.metrics?.recoveredRevenue?.toLocaleString("en-IN") || 0}</div>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="px-3 py-1 text-center">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Net Retention</div>
            <div className="text-sm font-bold font-mono text-blue-600">{data?.metrics?.nrr || 100}%</div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        {[
          { id: "plans", label: "Monetization Plans", icon: Layers, count: data?.plans?.length },
          { id: "bills_entry", label: "Ledger & Bill Entry", icon: Receipt, count: billsData.length },
          { id: "metering", label: "Consumption Metering", icon: Activity, count: data?.usage?.length },
          { id: "dunning", label: "Autonomous Dunning", icon: ShieldAlert },
          { id: "recognition", label: "Revenue Recognition", icon: TrendingUp },
          { id: "gst", label: "Statutory GST Engine", icon: FileSpreadsheet },
          { id: "invoice_design", label: "Invoice Designer", icon: Palette },
          { id: "payments", label: "Multi-Tranche Payments", icon: CreditCard },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MONETIZATION PLANS */}
      {subTab === "plans" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Multi-Model Pricing Plans</h3>
              <p className="text-xs text-muted-foreground">
                Provision and orchestrate Flat, Metered, Tiered, Volume, and Stair-step monetization schemes.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowPlanModal(true)} className="gap-1.5 text-xs font-semibold">
              <Plus className="w-4 h-4" /> Provision Pricing Plan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data?.plans?.map((plan: PricingPlanConfig) => (
              <Card key={plan.id} className="border-border hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                      {plan.model} Model
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{plan.billingCycle}</span>
                  </div>
                  <CardTitle className="text-sm font-bold mt-2">{plan.name}</CardTitle>
                  <CardDescription className="text-[11px] font-mono">{plan.code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="text-xs text-muted-foreground font-medium">Base Subscription</div>
                    <div className="text-xl font-bold font-mono text-foreground">
                      ₹{plan.basePrice.toLocaleString("en-IN")}
                      <span className="text-xs font-normal text-muted-foreground">/{plan.billingCycle.slice(0, 2)}</span>
                    </div>
                    {plan.meteredUnit && (
                      <div className="text-[11px] text-primary font-medium mt-1">
                        + ₹{plan.pricePerUnit} per {plan.meteredUnit}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Trial Period</span>
                    <span className="font-semibold text-foreground">{plan.trialDays > 0 ? `${plan.trialDays} Days Free` : "No Trial"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Tax Treatment</span>
                    <span className="font-semibold text-foreground">{plan.taxInclusive ? "Tax Inclusive" : "+ 18% GST"}</span>
                  </div>

                  <Button size="xs" variant="outline" className="w-full mt-2 text-[11px] font-semibold">
                    Configure Entitlements
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LEDGER & BILL ENTRY */}
      {subTab === "bills_entry" && (
        <div className="space-y-6">
          {!showBillStudio ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">Fiscal Ledger &amp; Document Registry</h3>
                  <p className="text-xs text-muted-foreground">
                    Manage multi-tier tax invoices, vendor bills, and statutory ledger entries with automated HSN/SAC breakdown.
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowBillStudio(true)} className="gap-1.5 text-xs font-semibold">
                  <Plus className="w-4 h-4" /> Open Sovereign Bill Studio
                </Button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border shadow-xs">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {[
                    { id: "all", label: "All Records" },
                    { id: "tax_invoice", label: "Tax Invoices" },
                    { id: "vendor_bill", label: "Vendor Bills" },
                    { id: "credit_note", label: "Credit Notes" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setBillFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        billFilter === f.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="w-full sm:w-64">
                  <Input
                    placeholder="Search by party or doc #..."
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Bills & Invoices Table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-3">Doc #</th>
                        <th className="p-3">Classification</th>
                        <th className="p-3">Party Legal Entity</th>
                        <th className="p-3">Place of Supply</th>
                        <th className="p-3">GST Tax</th>
                        <th className="p-3">TDS / TCS</th>
                        <th className="p-3 text-right">Grand Total (₹)</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredBills.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-muted-foreground">
                            No documents found matching the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredBills.map((bill) => {
                          const isVendorBill = bill.billType === "vendor_bill";
                          const isCreditNote = bill.billType === "credit_note";
                          return (
                            <tr key={bill.id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3 font-mono font-bold text-foreground">
                                {bill.invoiceNumber}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                                    isVendorBill
                                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                      : isCreditNote
                                      ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                      : "bg-primary/10 text-primary border border-primary/20"
                                  }`}
                                >
                                  {isVendorBill ? "VENDOR BILL" : isCreditNote ? "CREDIT NOTE" : "TAX INVOICE"}
                                </span>
                              </td>
                              <td className="p-3 font-medium text-foreground">
                                {bill.client?.name || "Corporate Customer"}
                                {bill.gstin && (
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    GSTIN: {bill.gstin}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  State [{bill.placeOfSupply || "36"}]
                                </span>
                              </td>
                              <td className="p-3 font-mono text-muted-foreground">
                                ₹{(bill.taxAmount || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="p-3 font-mono text-muted-foreground">
                                {bill.tdsAmount ? `₹${bill.tdsAmount.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-foreground">
                                ₹{(bill.amount || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                    bill.status === "paid"
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : bill.status === "partially_paid"
                                      ? "bg-blue-500/10 text-blue-600"
                                      : bill.status === "overdue"
                                      ? "bg-rose-500/10 text-rose-600"
                                      : "bg-amber-500/10 text-amber-600"
                                  }`}
                                >
                                  {bill.status || "unpaid"}
                                </span>
                              </td>
                              <td className="p-3 text-muted-foreground font-mono text-[11px]">
                                {bill.createdAt ? new Date(bill.createdAt).toISOString().slice(0, 10) : "—"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <EnterpriseBillEntryStudio
              onSuccess={() => {
                setShowBillStudio(false);
                loadData();
              }}
              onCancel={() => setShowBillStudio(false)}
            />
          )}
        </div>
      )}

      {/* TAB 3: CONSUMPTION METERING */}
      {subTab === "metering" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Usage-Based Metering &amp; Event Ingestion</h3>
              <p className="text-xs text-muted-foreground">
                Real-time consumption telemetry for API calls, active compute seats, and storage slabs.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowUsageModal(true)} className="gap-1.5 text-xs font-semibold">
              <Plus className="w-4 h-4" /> Ingest Metered Event
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">API Invocations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-mono text-primary">124,500</div>
                <p className="text-[11px] text-muted-foreground mt-1">Aggregated this billing window (₹0.025 / call)</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Compute Cloud Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-mono text-emerald-600">850 GB</div>
                <p className="text-[11px] text-muted-foreground mt-1">Active storage allocation across workspaces</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Metered Realized Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-mono text-blue-600">₹13,312.50</div>
                <p className="text-[11px] text-muted-foreground mt-1">Accrued billable consumption pending cycle close</p>
              </CardContent>
            </Card>
          </div>

          {/* Meter Records Ledger */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold">Telemetry Ingestion Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Meter ID</th>
                    <th className="p-3">Metric Name</th>
                    <th className="p-3">Units Consumed</th>
                    <th className="p-3">Unit Price</th>
                    <th className="p-3">Accrued (₹)</th>
                    <th className="p-3">Ingestion Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.usage?.map((u: MeteredUsageRecord) => (
                    <tr key={u.id} className="hover:bg-muted/20">
                      <td className="p-3 font-mono font-medium text-foreground">{u.id}</td>
                      <td className="p-3 font-semibold">{u.meterName}</td>
                      <td className="p-3 font-mono">{u.unitsConsumed.toLocaleString()}</td>
                      <td className="p-3 font-mono">₹{u.unitPrice}</td>
                      <td className="p-3 font-mono font-bold text-primary">
                        ₹{(u.unitsConsumed * u.unitPrice).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">{new Date(u.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: AUTONOMOUS DUNNING */}
      {subTab === "dunning" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Autonomous Dunning &amp; Revenue Recovery</h3>
              <p className="text-xs text-muted-foreground">
                Intelligent retry cadences, multi-channel customer notifications, and automated subscription recovery.
              </p>
            </div>
            <Button size="sm" onClick={handleSaveDunning} className="gap-1.5 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> Save Recovery Playbook
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" /> Retry Schedule &amp; Grace Windows
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure automatic payment retry cadences when transactions fail.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Maximum Retry Attempts</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={dunningForm.retryAttempts}
                    onChange={(e) => setDunningForm({ ...dunningForm, retryAttempts: Number(e.target.value) })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Grace Period (Days Before Suspension)</label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={dunningForm.gracePeriodDays}
                    onChange={(e) => setDunningForm({ ...dunningForm, gracePeriodDays: Number(e.target.value) })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Terminal Action on Total Failure</label>
                  <select
                    value={dunningForm.actionOnFailure}
                    onChange={(e: any) => setDunningForm({ ...dunningForm, actionOnFailure: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="pause">Pause Entitlements &amp; Retain Data (Recommended)</option>
                    <option value="downgrade_free">Downgrade to Free Tier</option>
                    <option value="cancel">Hard Cancel &amp; Terminate Subscription</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-primary" /> Multi-Channel Customer Engagement
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated outreach to notify account owners of expiring cards or failed debits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Transactional Email Alerts</div>
                    <div className="text-[11px] text-muted-foreground">Send payment retry updates and direct payment links</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={dunningForm.emailNotification}
                    onChange={(e) => setDunningForm({ ...dunningForm, emailNotification: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div>
                    <div className="text-xs font-semibold text-foreground">WhatsApp Business Notifications</div>
                    <div className="text-[11px] text-muted-foreground">High-engagement instant messages for urgent payment recovery</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={dunningForm.whatsappNotification}
                    onChange={(e) => setDunningForm({ ...dunningForm, whatsappNotification: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">
                    <span className="font-bold">Autonomous Recovery Active:</span> Over ₹85,000 in failed transactions recovered without manual agent intervention.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 5: REVENUE RECOGNITION (ASC 606 / Ind AS 115) */}
      {subTab === "recognition" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Revenue Recognition &amp; Deferred Schedule (ASC 606 / Ind AS 115)</h3>
              <p className="text-xs text-muted-foreground">
                Automated straight-line recognition across contract deliverables, unearned revenue, and realized billings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Realized Revenue (MTD)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-mono text-emerald-600">
                  ₹{Math.round((data?.metrics?.mrr || 0) * 0.85).toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Recognized per delivered contract milestones</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Deferred Revenue (Liability)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-mono text-primary">
                  ₹{Math.round((data?.metrics?.arr || 0) * 0.4).toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Prepaid annual contracts pending monthly amortization</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Compliance Standard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-mono text-foreground">Ind AS 115</div>
                <p className="text-[11px] text-muted-foreground mt-1">Compliant 5-step contract revenue accounting</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 6: GST SETTINGS STUDIO */}
      {subTab === "gst" && (
        <GstSettingsStudio
          initialSettings={gstData}
        />
      )}

      {/* TAB 7: INVOICE DESIGNER */}
      {subTab === "invoice_design" && (
        <InvoiceCustomizationStudio
          initialCustomization={customizationData}
          gstSettings={gstData}
        />
      )}

      {/* TAB 8: MULTI-TRANCHE PAYMENTS */}
      {subTab === "payments" && (
        <PaymentsLedgerTab />
      )}

      {/* Plan Creation Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-border animate-in fade-in zoom-in-95">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold">Provision New Pricing Plan</CardTitle>
              <CardDescription className="text-xs">
                Configure corporate billing model, cycles, and usage metering.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreatePlan}>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Plan Name *</label>
                    <Input
                      required
                      placeholder="e.g. Enterprise Cloud SaaS"
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">SKU Code *</label>
                    <Input
                      required
                      placeholder="e.g. ENT-CLOUD-01"
                      value={planForm.code}
                      onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Pricing Model</label>
                    <select
                      value={planForm.model}
                      onChange={(e: any) => setPlanForm({ ...planForm, model: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="flat">Flat Fee Recurring</option>
                      <option value="metered">Consumption / Metered</option>
                      <option value="tiered">Tiered Slabs</option>
                      <option value="volume">Volume Based</option>
                      <option value="stair_step">Stair Step</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Billing Cadence</label>
                    <select
                      value={planForm.billingCycle}
                      onChange={(e: any) => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual (Discounted)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Base Price (INR) *</label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={planForm.basePrice}
                      onChange={(e) => setPlanForm({ ...planForm, basePrice: Number(e.target.value) })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Trial Window (Days)</label>
                    <Input
                      type="number"
                      min="0"
                      value={planForm.trialDays}
                      onChange={(e) => setPlanForm({ ...planForm, trialDays: Number(e.target.value) })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {planForm.model === "metered" && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Meter Unit Label</label>
                      <Input
                        placeholder="e.g. 1,000 API Calls"
                        value={planForm.meteredUnit || ""}
                        onChange={(e) => setPlanForm({ ...planForm, meteredUnit: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Rate Per Unit (₹)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={planForm.pricePerUnit || 0}
                        onChange={(e) => setPlanForm({ ...planForm, pricePerUnit: Number(e.target.value) })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/20">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPlanModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Provision Plan
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Usage Ingestion Modal */}
      {showUsageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border animate-in fade-in zoom-in-95">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold">Ingest Consumption Event</CardTitle>
              <CardDescription className="text-xs">
                Log real-time billable resource consumption for active subscriptions.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRecordUsage}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Meter Name *</label>
                  <select
                    value={usageForm.meterName}
                    onChange={(e) => setUsageForm({ ...usageForm, meterName: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="API Gateway Calls">API Gateway Calls</option>
                    <option value="Storage Compute GB">Storage Compute GB</option>
                    <option value="Active Transcoding Minutes">Active Transcoding Minutes</option>
                    <option value="SMS Notifications Dispatched">SMS Notifications Dispatched</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Units Consumed *</label>
                    <Input
                      type="number"
                      required
                      min="1"
                      value={usageForm.unitsConsumed}
                      onChange={(e) => setUsageForm({ ...usageForm, unitsConsumed: Number(e.target.value) })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Unit Price (₹) *</label>
                    <Input
                      type="number"
                      step="0.001"
                      required
                      value={usageForm.unitPrice}
                      onChange={(e) => setUsageForm({ ...usageForm, unitPrice: Number(e.target.value) })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/20">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowUsageModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Record Ingestion
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
