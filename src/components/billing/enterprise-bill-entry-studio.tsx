"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Receipt,
  Building2,
  Calendar,
  CreditCard,
  Percent,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  Tag,
  Truck,
  DollarSign,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  INDIAN_STATES,
  COMMON_HSN_SAC_CODES,
  validateGSTIN,
} from "@/lib/gst-engine";
import {
  createEnterpriseFiscalBill,
  getFiscalBillingParties,
  FiscalLineItem,
  EnterpriseFiscalBillInput,
} from "@/app/actions/fiscal-billing";
import { toast } from "sonner";

// Number to Indian Currency Words helper
function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return "Zero Rupees Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  }

  const rounded = Math.round(num);
  return `${inWords(rounded)} Rupees Only`;
}

interface EnterpriseBillEntryStudioProps {
  onSuccess?: (createdBill: any) => void;
  onCancel?: () => void;
  initialType?: "tax_invoice" | "vendor_bill" | "proforma" | "credit_note";
  supplierStateCode?: string;
}

export function EnterpriseBillEntryStudio({
  onSuccess,
  onCancel,
  initialType = "tax_invoice",
  supplierStateCode = "36", // Default Telangana
}: EnterpriseBillEntryStudioProps) {
  const [submitting, setSubmitting] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [parties, setParties] = useState<{ companies: any[]; clients: any[]; contacts: any[] }>({
    companies: [],
    clients: [],
    contacts: [],
  });

  // Main Form State
  const [billType, setBillType] = useState<"tax_invoice" | "vendor_bill" | "proforma" | "credit_note">(initialType);
  const [partyName, setPartyName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(undefined);
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState(supplierStateCode);

  const [invoiceNumber, setInvoiceNumber] = useState(
    `${initialType === "vendor_bill" ? "BILL" : "INV"}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
  );
  const [poNumber, setPoNumber] = useState("");
  const [eWayBillNumber, setEWayBillNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentTerms, setPaymentTerms] = useState<"due_on_receipt" | "net_15" | "net_30" | "net_45" | "net_60" | "net_90" | "custom">("net_30");
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [accountCategory, setAccountCategory] = useState("Software & Cloud SaaS");
  const [isRcm, setIsRcm] = useState(false);

  // Line items state
  const [lineItems, setLineItems] = useState<FiscalLineItem[]>([
    {
      id: "row_1",
      name: "Enterprise CRM & Revenue Cloud Subscription",
      description: "Annual SaaS enterprise plan with unlimited seats & multi-tenant access",
      hsnSac: "998313",
      qty: 1,
      unit: "Nos",
      unitPrice: 150000,
      discountPercent: 0,
      taxPercent: 18,
      subtotal: 150000,
      cgst: 13500,
      sgst: 13500,
      igst: 0,
      total: 177000,
    },
  ]);

  // Adjustments
  const [shippingCharges, setShippingCharges] = useState<number>(0);
  const [tdsSection, setTdsSection] = useState<string>("none");
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [customRoundOff, setCustomRoundOff] = useState<number>(0);
  const [notes, setNotes] = useState("Remittance details attached. Standard corporate credit terms apply.");
  const [termsAndConditions, setTermsAndConditions] = useState(
    "1. Settlement strictly required per stipulated credit timeline.\n2. Commercial statutory interest @ 18% per annum applicable post due date.\n3. Sovereign corporate dispute jurisdiction applies."
  );

  const isIntraState = placeOfSupply === supplierStateCode;

  // Load parties for autocomplete
  useEffect(() => {
    async function loadParties() {
      try {
        const res = await getFiscalBillingParties();
        setParties(res);
      } catch (e) {
        console.error("Error loading parties:", e);
      } finally {
        setPartiesLoading(false);
      }
    }
    loadParties();
  }, []);

  // Update Due Date when Payment Terms or Invoice Date changes
  useEffect(() => {
    if (paymentTerms === "custom") return;
    const days =
      paymentTerms === "due_on_receipt"
        ? 0
        : paymentTerms === "net_15"
        ? 15
        : paymentTerms === "net_30"
        ? 30
        : paymentTerms === "net_45"
        ? 45
        : paymentTerms === "net_60"
        ? 60
        : paymentTerms === "net_90"
        ? 90
        : 30;

    const base = new Date(invoiceDate || Date.now());
    const target = new Date(base.getTime() + days * 86400000);
    setDueDate(target.toISOString().slice(0, 10));
  }, [paymentTerms, invoiceDate]);

  // Handle party autocomplete selection
  const handleSelectParty = (partyId: string, type: "company" | "client") => {
    if (type === "company") {
      const cmp = parties.companies.find((c) => c.id === partyId);
      if (cmp) {
        setPartyName(cmp.name);
        setSelectedCompanyId(cmp.id);
        if (cmp.gstin) {
          setGstin(cmp.gstin);
          const v = validateGSTIN(cmp.gstin);
          if (v.isValid && v.stateCode) setPlaceOfSupply(v.stateCode);
          if (v.pan) setPan(v.pan);
        }
        if (cmp.address) {
          const fullAddr = [cmp.address, cmp.city, cmp.state, cmp.postalCode].filter(Boolean).join(", ");
          setBillingAddress(fullAddr);
          setShippingAddress(fullAddr);
        }
      }
    } else {
      const cli = parties.clients.find((c) => c.id === partyId);
      if (cli) {
        setPartyName(cli.name);
        setSelectedClientId(cli.id);
      }
    }
  };

  // Handle GSTIN change & state auto-extraction
  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase();
    setGstin(upper);
    if (upper.length >= 2) {
      const stateCode = upper.slice(0, 2);
      const matched = INDIAN_STATES.find((s) => s.code === stateCode);
      if (matched) setPlaceOfSupply(matched.code);
    }
    if (upper.length >= 12) {
      const extractedPan = upper.slice(2, 12);
      setPan(extractedPan);
    }
  };

  // Recalculate row items
  const recalculateItem = (item: FiscalLineItem, intra: boolean): FiscalLineItem => {
    const raw = item.qty * item.unitPrice;
    const discount = item.discountPercent ? (raw * item.discountPercent) / 100 : 0;
    const taxable = Math.max(0, raw - discount);
    const taxRate = item.taxPercent || 0;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (intra) {
      cgst = Math.round(((taxable * (taxRate / 2)) / 100) * 100) / 100;
      sgst = Math.round(((taxable * (taxRate / 2)) / 100) * 100) / 100;
    } else {
      igst = Math.round(((taxable * taxRate) / 100) * 100) / 100;
    }

    const total = taxable + cgst + sgst + igst;

    return {
      ...item,
      subtotal: taxable,
      cgst,
      sgst,
      igst,
      total,
    };
  };

  // Update line item property
  const handleUpdateLineItem = (id: string, field: keyof FiscalLineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        return recalculateItem(updated, isIntraState);
      })
    );
  };

  // When place of supply changes, recalculate all line items
  useEffect(() => {
    setLineItems((prev) => prev.map((item) => recalculateItem(item, isIntraState)));
  }, [placeOfSupply, supplierStateCode]);

  // Add new row
  const handleAddRow = () => {
    const newId = `row_${Date.now()}`;
    const newItem: FiscalLineItem = {
      id: newId,
      name: "",
      description: "",
      hsnSac: "998313",
      qty: 1,
      unit: "Nos",
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 18,
      subtotal: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  // Remove row
  const handleRemoveRow = (id: string) => {
    if (lineItems.length <= 1) {
      toast.error("At least one line item is required.");
      return;
    }
    setLineItems(lineItems.filter((i) => i.id !== id));
  };

  // Clone row
  const handleCloneRow = (item: FiscalLineItem) => {
    const cloned: FiscalLineItem = {
      ...item,
      id: `row_${Date.now()}`,
    };
    setLineItems([...lineItems, cloned]);
  };

  // Financial Calculations Summary
  const financialTotals = useMemo(() => {
    let subtotalRaw = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const hsnMap: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; total: number }> = {};

    lineItems.forEach((item) => {
      const raw = item.qty * item.unitPrice;
      const disc = item.discountPercent ? (raw * item.discountPercent) / 100 : 0;
      const taxVal = item.subtotal;

      subtotalRaw += raw;
      totalDiscount += disc;
      taxableAmount += taxVal;
      cgstTotal += item.cgst;
      sgstTotal += item.sgst;
      igstTotal += item.igst;

      const code = item.hsnSac || "998313";
      if (!hsnMap[code]) {
        hsnMap[code] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
      }
      hsnMap[code].taxable += taxVal;
      hsnMap[code].cgst += item.cgst;
      hsnMap[code].sgst += item.sgst;
      hsnMap[code].igst += item.igst;
      hsnMap[code].total += item.total;
    });

    const totalTax = cgstTotal + sgstTotal + igstTotal;
    const preRoundTotal = taxableAmount + totalTax + Number(shippingCharges || 0);

    // TDS / TCS Calculation
    let tdsRate = 0;
    if (tdsSection === "194c") tdsRate = 1; // 1%
    else if (tdsSection === "194j") tdsRate = 10; // 10%
    else if (tdsSection === "194q") tdsRate = 0.1; // 0.1%
    else if (tdsSection === "206c") tdsRate = 0.075; // 0.075%

    const tdsAmount = tdsRate > 0 ? Math.round(((taxableAmount * tdsRate) / 100) * 100) / 100 : 0;

    const afterTds = preRoundTotal - tdsAmount;

    let roundOff = 0;
    let finalGrandTotal = afterTds;

    if (autoRoundOff) {
      finalGrandTotal = Math.round(afterTds);
      roundOff = Math.round((finalGrandTotal - afterTds) * 100) / 100;
    } else {
      roundOff = customRoundOff || 0;
      finalGrandTotal = afterTds + roundOff;
    }

    return {
      subtotalRaw,
      totalDiscount,
      taxableAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      totalTax,
      shippingCharges: Number(shippingCharges || 0),
      tdsRate,
      tdsAmount,
      roundOff,
      grandTotal: Math.max(0, finalGrandTotal),
      hsnSummary: Object.entries(hsnMap).map(([hsn, data]) => ({ hsn, ...data })),
    };
  }, [lineItems, shippingCharges, tdsSection, autoRoundOff, customRoundOff]);

  // Submit Handler
  const handleSubmit = async (status: "draft" | "unpaid" | "paid") => {
    if (!partyName.trim()) {
      toast.error("Please enter or select a customer / vendor name.");
      return;
    }

    if (lineItems.length === 0 || !lineItems.some((i) => i.name.trim())) {
      toast.error("Please provide at least one valid line item.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: EnterpriseFiscalBillInput = {
        billType,
        partyName: partyName.trim(),
        partyType: billType === "vendor_bill" ? "vendor" : "customer",
        clientId: selectedClientId,
        companyId: selectedCompanyId,
        gstin: gstin.trim() || undefined,
        pan: pan.trim() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        shippingAddress: shippingAddress.trim() || undefined,
        placeOfSupplyStateCode: placeOfSupply,
        placeOfSupplyStateName: INDIAN_STATES.find((s) => s.code === placeOfSupply)?.name,
        invoiceNumber: invoiceNumber.trim(),
        poNumber: poNumber.trim() || undefined,
        eWayBillNumber: eWayBillNumber.trim() || undefined,
        invoiceDate,
        dueDate,
        paymentTerms,
        accountCategory,
        isRcm,
        lineItems,
        subtotal: financialTotals.subtotalRaw,
        totalDiscount: financialTotals.totalDiscount,
        taxableAmount: financialTotals.taxableAmount,
        cgstAmount: financialTotals.cgstTotal,
        sgstAmount: financialTotals.sgstTotal,
        igstAmount: financialTotals.igstTotal,
        shippingCharges: financialTotals.shippingCharges,
        tdsSection: tdsSection !== "none" ? tdsSection : undefined,
        tdsRate: financialTotals.tdsRate,
        tdsAmount: financialTotals.tdsAmount,
        roundOff: financialTotals.roundOff,
        grandTotal: financialTotals.grandTotal,
        notes: notes.trim(),
        termsAndConditions: termsAndConditions.trim(),
        status,
      };

      const created = await createEnterpriseFiscalBill(payload);
      toast.success(
        `Fiscal ${billType === "vendor_bill" ? "Bill" : "Invoice"} ${created.invoiceNumber} recorded successfully!`
      );
      if (onSuccess) onSuccess(created);
    } catch (err: any) {
      toast.error(err.message || "Failed to save fiscal bill.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-linear-to-r from-primary/10 via-background to-primary/5 border border-primary/20 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary text-primary-foreground">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Enterprise Fiscal Studio™</h2>
              <p className="text-xs text-muted-foreground">
                Institutional tax-compliant document entry with multi-line HSN/SAC, Place of Supply routing, TDS/TCS, and ledger allocation.
              </p>
            </div>
          </div>
        </div>

        {/* Bill Type Selector */}
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl border border-border">
          {[
            { id: "tax_invoice", label: "Tax Invoice" },
            { id: "vendor_bill", label: "Vendor Bill" },
            { id: "proforma", label: "Proforma" },
            { id: "credit_note", label: "Credit Note" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setBillType(t.id as any);
                setInvoiceNumber(
                  `${t.id === "vendor_bill" ? "BILL" : t.id === "credit_note" ? "CN" : t.id === "proforma" ? "PRO" : "INV"}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
                );
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                billType === t.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Party, Metadata & Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Customer / Vendor Party Details */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  {billType === "vendor_bill" ? "Vendor / Supplier Details" : "Customer / Bill-To Party"}
                </CardTitle>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  Org Origin: Telangana ({supplierStateCode})
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Party Name with quick select */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      {billType === "vendor_bill" ? "Vendor Legal Entity" : "Customer Legal Entity"} *
                    </label>
                    {parties.companies.length > 0 && (
                      <select
                        className="text-[11px] text-primary bg-transparent border-none outline-hidden cursor-pointer"
                        onChange={(e) => {
                          if (e.target.value) handleSelectParty(e.target.value, "company");
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select Existing...
                        </option>
                        {parties.companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <Input
                    required
                    placeholder="e.g. Acme Enterprise Technologies Pvt Ltd"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {/* GSTIN with auto PAN and State extraction */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">GSTIN / Corporate Tax ID</label>
                    <span className="text-[10px] text-muted-foreground">15-digit GST Identifier</span>
                  </div>
                  <Input
                    placeholder="e.g. 36AAECK1234F1Z5"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* PAN Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Corporate PAN</label>
                  <Input
                    placeholder="e.g. AAECK1234F"
                    maxLength={10}
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>

                {/* Place of Supply */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Place of Supply (POS) *</label>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isIntraState
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                      }`}
                    >
                      {isIntraState ? "Intra-State (CGST + SGST)" : "Inter-State (IGST)"}
                    </span>
                  </div>
                  <select
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st.code} value={st.code}>
                        [{st.code}] {st.name} {st.code === supplierStateCode ? " (Home State)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Billing and Shipping Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Registered Billing Address</label>
                  <textarea
                    rows={2}
                    placeholder="Corporate Street, City, State, PIN Code"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Shipping / Site Address</label>
                    <button
                      type="button"
                      onClick={() => setShippingAddress(billingAddress)}
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      Same as Billing
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Delivery Destination / Operations Hub"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Invoice Metadata & Terms */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Fiscal Terms &amp; Settlement Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Document Ref # *</label>
                  <Input
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="h-9 text-xs font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Effective Date</label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Payment Schedule</label>
                  <select
                    value={paymentTerms}
                    onChange={(e: any) => setPaymentTerms(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="due_on_receipt">Immediate (Due on Receipt)</option>
                    <option value="net_15">Net 15 Days</option>
                    <option value="net_30">Net 30 Days (Standard)</option>
                    <option value="net_45">Net 45 Days</option>
                    <option value="net_60">Net 60 Days</option>
                    <option value="net_90">Net 90 Days</option>
                    <option value="custom">Custom Specified Window</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Settlement Due Date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    disabled={paymentTerms !== "custom"}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Purchase Order (PO) #</label>
                  <Input
                    placeholder="e.g. PO-2026-904"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">E-Way Bill / IRN #</label>
                  <Input
                    placeholder="e.g. 121045982341"
                    value={eWayBillNumber}
                    onChange={(e) => setEWayBillNumber(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">General Ledger Code</label>
                  <select
                    value={accountCategory}
                    onChange={(e) => setAccountCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="Software & Cloud SaaS">Software &amp; Cloud SaaS</option>
                    <option value="Consulting & Engineering">Consulting &amp; Engineering</option>
                    <option value="Infrastructure & Colocation">Infrastructure &amp; Hosting</option>
                    <option value="Marketing & Lead Acquisition">Marketing &amp; Advertising</option>
                    <option value="Office Supplies & Operations">Office &amp; Hardware</option>
                    <option value="Contractor & Freelancer Fees">Contractor &amp; Vendor Fees</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="rcmToggle"
                    checked={isRcm}
                    onChange={(e) => setIsRcm(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <label htmlFor="rcmToggle" className="text-xs font-semibold text-foreground cursor-pointer">
                    Reverse Charge (RCM)
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Dynamic Multi-Row Line Items */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Line Items &amp; Tax Valuation Ledger
                  </CardTitle>
                  <CardDescription className="text-xs">
                    HSN/SAC compliant item breakdown with automated intra/inter state tax splitting.
                  </CardDescription>
                </div>
                <Button size="xs" onClick={handleAddRow} className="gap-1.5 text-xs font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3 w-8">#</th>
                      <th className="p-3 min-w-[200px]">Item Description &amp; Scope</th>
                      <th className="p-3 min-w-[120px]">HSN / SAC</th>
                      <th className="p-3 w-20">Qty</th>
                      <th className="p-3 w-20">Unit</th>
                      <th className="p-3 w-28">Unit Rate (₹)</th>
                      <th className="p-3 w-20">Disc %</th>
                      <th className="p-3 w-24">GST Rate</th>
                      <th className="p-3 w-28 text-right">Taxable (₹)</th>
                      <th className="p-3 w-28 text-right">Total (₹)</th>
                      <th className="p-3 w-16 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lineItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-3 space-y-1">
                          <Input
                            placeholder="Product name / deliverable..."
                            value={item.name}
                            onChange={(e) => handleUpdateLineItem(item.id, "name", e.target.value)}
                            className="h-8 text-xs font-semibold"
                          />
                          <Input
                            placeholder="Technical specification / details..."
                            value={item.description}
                            onChange={(e) => handleUpdateLineItem(item.id, "description", e.target.value)}
                            className="h-7 text-[11px] text-muted-foreground"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={item.hsnSac}
                            onChange={(e) => handleUpdateLineItem(item.id, "hsnSac", e.target.value)}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-[11px] font-mono"
                          >
                            {COMMON_HSN_SAC_CODES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code} ({c.type})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleUpdateLineItem(item.id, "qty", Number(e.target.value))}
                            className="h-8 text-xs text-center"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={item.unit}
                            onChange={(e) => handleUpdateLineItem(item.id, "unit", e.target.value)}
                            className="w-full h-8 rounded-md border border-input bg-background px-1.5 text-[11px]"
                          >
                            <option value="Nos">Nos</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Hours">Hours</option>
                            <option value="Days">Days</option>
                            <option value="Months">Months</option>
                            <option value="Set">Set</option>
                            <option value="Kg">Kg</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateLineItem(item.id, "unitPrice", Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => handleUpdateLineItem(item.id, "discountPercent", Number(e.target.value))}
                            className="h-8 text-xs text-center"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={item.taxPercent}
                            onChange={(e) => handleUpdateLineItem(item.id, "taxPercent", Number(e.target.value))}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-[11px] font-semibold"
                          >
                            <option value="0">0% (Exempt)</option>
                            <option value="5">5% GST</option>
                            <option value="12">12% GST</option>
                            <option value="18">18% GST</option>
                            <option value="28">28% GST</option>
                          </select>
                        </td>
                        <td className="p-3 text-right font-mono font-medium">
                          ₹{item.subtotal.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          ₹{item.total.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCloneRow(item)}
                              title="Duplicate row"
                              className="p-1 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(item.id)}
                              title="Delete row"
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Row Button under table */}
              <div className="p-3 border-t border-border flex justify-between items-center bg-muted/20">
                <Button size="xs" variant="outline" onClick={handleAddRow} className="gap-1.5 text-xs font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Add Billable Line Item
                </Button>
                <span className="text-xs text-muted-foreground font-medium">
                  {lineItems.length} {lineItems.length === 1 ? "item" : "items"} allocated
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Notes & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold">Party Instructions &amp; Bank Remittance</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs resize-none"
                  placeholder="Remittance coordinates and recipient instructions..."
                />
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold">Statutory Terms &amp; Settlement Conditions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <textarea
                  rows={3}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs resize-none"
                  placeholder="Commercial terms and interest penalties..."
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right 1 Col: Financial Summary & Actions */}
        <div className="space-y-6">
          <Card className="border-primary/30 shadow-md bg-card sticky top-6">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Statutory Tax &amp; Settlement Ledger
                </CardTitle>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Keel LedgerOS™
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-xs">
              {/* Gross Subtotal */}
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Items Gross Valuation</span>
                <span className="font-mono">₹{financialTotals.subtotalRaw.toLocaleString("en-IN")}</span>
              </div>

              {/* Discounts */}
              {financialTotals.totalDiscount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-medium">
                  <span>Contractual Concessions</span>
                  <span className="font-mono">- ₹{financialTotals.totalDiscount.toLocaleString("en-IN")}</span>
                </div>
              )}

              {/* Taxable Amount */}
              <div className="flex justify-between items-center font-semibold pt-1 border-t border-border/50 text-foreground">
                <span>Net Taxable Base</span>
                <span className="font-mono">₹{financialTotals.taxableAmount.toLocaleString("en-IN")}</span>
              </div>

              {/* Tax Breakdown */}
              {isIntraState ? (
                <>
                  <div className="flex justify-between items-center text-muted-foreground pl-2 border-l-2 border-emerald-500/50">
                    <span>CGST (Central Tax)</span>
                    <span className="font-mono text-foreground font-medium">
                      ₹{financialTotals.cgstTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground pl-2 border-l-2 border-emerald-500/50">
                    <span>SGST (State Tax)</span>
                    <span className="font-mono text-foreground font-medium">
                      ₹{financialTotals.sgstTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-muted-foreground pl-2 border-l-2 border-blue-500/50">
                  <span>IGST (Integrated Tax)</span>
                  <span className="font-mono text-foreground font-medium">
                    ₹{financialTotals.igstTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* Shipping / Freight */}
              <div className="pt-2 border-t border-border/50 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Logistics &amp; Freight (₹)
                  </span>
                  <Input
                    type="number"
                    min="0"
                    value={shippingCharges}
                    onChange={(e) => setShippingCharges(Number(e.target.value))}
                    className="w-24 h-7 text-xs text-right font-mono"
                  />
                </div>
              </div>

              {/* TDS / TCS Withholding */}
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Statutory TDS / TCS
                  </span>
                  <select
                    value={tdsSection}
                    onChange={(e) => setTdsSection(e.target.value)}
                    className="h-7 text-[11px] rounded border border-input bg-background px-2"
                  >
                    <option value="none">No Withholding</option>
                    <option value="194c">194C - Contractor (1%)</option>
                    <option value="194j">194J - Tech &amp; Professional (10%)</option>
                    <option value="194q">194Q - Goods Purchase (0.1%)</option>
                    <option value="206c">206C - TCS Sales (0.075%)</option>
                  </select>
                </div>
                {financialTotals.tdsAmount > 0 && (
                  <div className="flex justify-between items-center text-rose-600 font-medium pl-2">
                    <span>TDS Deducted ({financialTotals.tdsRate}%)</span>
                    <span className="font-mono">- ₹{financialTotals.tdsAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>

              {/* Round-Off Adjustment */}
              <div className="flex justify-between items-center text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <span>Round-off</span>
                  <button
                    type="button"
                    onClick={() => setAutoRoundOff(!autoRoundOff)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    ({autoRoundOff ? "Auto" : "Manual"})
                  </button>
                </div>
                <span className="font-mono">
                  {financialTotals.roundOff >= 0 ? `+ ₹${financialTotals.roundOff}` : `- ₹${Math.abs(financialTotals.roundOff)}`}
                </span>
              </div>

              {/* Grand Total */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-2 mt-4">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-sm text-foreground">Sovereign Grand Total</span>
                  <span className="text-2xl font-black font-mono text-primary">
                    ₹{financialTotals.grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground italic font-medium leading-tight">
                  {numberToIndianWords(financialTotals.grandTotal)}
                </p>
              </div>

              {/* HSN Summary Pill */}
              <div className="pt-2">
                <details className="group text-[11px] cursor-pointer">
                  <summary className="text-muted-foreground font-semibold list-none flex items-center justify-between py-1">
                    <span>HSN / SAC Classification Summary ({financialTotals.hsnSummary.length})</span>
                    <span className="text-primary text-[10px] group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-border">
                    {financialTotals.hsnSummary.map((h) => (
                      <div key={h.hsn} className="flex justify-between text-muted-foreground font-mono">
                        <span>SAC {h.hsn}:</span>
                        <span>₹{h.taxable.toLocaleString("en-IN")} @ {isIntraState ? `₹${h.cgst + h.sgst} GST` : `₹${h.igst} IGST`}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-2">
                <Button
                  onClick={() => handleSubmit("unpaid")}
                  disabled={submitting}
                  className="w-full font-bold text-xs gap-2 h-10 shadow-sm"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {billType === "vendor_bill" ? "Post Vendor Bill to Ledger" : "Issue Sovereign Invoice"}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSubmit("draft")}
                    disabled={submitting}
                    className="w-full text-xs font-semibold"
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={submitting}
                    className="w-full text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
