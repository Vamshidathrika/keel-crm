"use client";

import React, { useState } from "react";
import { FileText, Plus, Search, Layers, Calendar, DollarSign, PenTool, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QuotesClientProps {
  user: any;
}

const INITIAL_QUOTES = [
  {
    id: "QTE-501",
    customer: "Precision Auto Components Ltd.",
    partNo: "C-9908 (Alloy Wheel molds)",
    qty: 50,
    unitPrice: "₹1,20,000",
    total: "₹60,00,000",
    leadTime: "4 weeks",
    status: "Approved",
  },
  {
    id: "QTE-502",
    customer: "Vindhya heavy electrics",
    partNo: "S-1011 (Turbine gaskets)",
    qty: 15,
    unitPrice: "₹4,50,000",
    total: "₹67,50,000",
    leadTime: "6 weeks",
    status: "Draft",
  },
  {
    id: "QTE-503",
    customer: "Apex Castings Inc.",
    partNo: "A-5491 (Hydraulic valves)",
    qty: 200,
    unitPrice: "₹18,000",
    total: "₹36,00,000",
    leadTime: "3 weeks",
    status: "Sent to Client",
  },
];

export default function QuotesClient({ user }: QuotesClientProps) {
  const [quotes, setQuotes] = useState(INITIAL_QUOTES);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({
    customer: "",
    partNo: "",
    qty: 1,
    unitPrice: "",
    total: "",
    leadTime: "3 weeks",
    status: "Draft",
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.customer || !newForm.partNo || !newForm.unitPrice) return;
    const qtyVal = Number(newForm.qty) || 1;
    const unitPriceNum = Number(newForm.unitPrice.replace(/[^0-9]/g, "")) || 0;
    const computedTotal = qtyVal * unitPriceNum;

    const newQuote = {
      id: `QTE-${Math.floor(500 + Math.random() * 500)}`,
      customer: newForm.customer,
      partNo: newForm.partNo,
      qty: qtyVal,
      unitPrice: `₹${unitPriceNum.toLocaleString("en-IN")}`,
      total: `₹${computedTotal.toLocaleString("en-IN")}`,
      leadTime: newForm.leadTime,
      status: newForm.status,
    };
    setQuotes([newQuote, ...quotes]);
    setShowAdd(false);
    setNewForm({
      customer: "",
      partNo: "",
      qty: 1,
      unitPrice: "",
      total: "",
      leadTime: "3 weeks",
      status: "Draft",
    });
  };

  const filtered = quotes.filter(
    (q) =>
      q.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.partNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> CPQ Quote Builder
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manufacturing Vertical — Configure pricing schemas, estimate production lead times, and dispatch quotes with BOM parameters.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Create CPQ Quote
        </Button>
      </div>

      {showAdd && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Configure Proposal Quote (CPQ)</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Define product part specs, order volume quantities, and manufacturing lead times.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Client Company</label>
                  <Input
                    placeholder="Customer Account name"
                    value={newForm.customer}
                    onChange={(e) => setNewForm({ ...newForm, customer: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Product SKU / Part Number</label>
                  <Input
                    placeholder="e.g. M-889 (Copper Coils)"
                    value={newForm.partNo}
                    onChange={(e) => setNewForm({ ...newForm, partNo: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Order Quantity</label>
                  <Input
                    type="number"
                    value={newForm.qty}
                    onChange={(e) => setNewForm({ ...newForm, qty: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Unit Cost (₹)</label>
                  <Input
                    placeholder="e.g. 50000"
                    value={newForm.unitPrice}
                    onChange={(e) => setNewForm({ ...newForm, unitPrice: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Production Lead Time</label>
                  <Input
                    placeholder="e.g. 4 weeks"
                    value={newForm.leadTime}
                    onChange={(e) => setNewForm({ ...newForm, leadTime: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Quote Stage</label>
                  <select
                    value={newForm.status}
                    onChange={(e) => setNewForm({ ...newForm, status: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option>Draft</option>
                    <option>Pending Manager Review</option>
                    <option>Sent to Client</option>
                    <option>Approved</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit">Compile Quote</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter active quotes..."
            className="pl-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((q) => (
          <Card key={q.id} className="border border-border bg-card">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {q.id}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Part: {q.partNo}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-1">{q.customer}</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span>Quantity: <span className="font-semibold text-foreground">{q.qty}</span></span>
                  <span>•</span>
                  <span>Unit Price: <span className="font-semibold text-foreground">{q.unitPrice}</span></span>
                  <span>•</span>
                  <span>Lead Time: <span className="font-semibold text-foreground">{q.leadTime}</span></span>
                </div>
              </div>

              <div className="flex sm:flex-col items-end gap-4 sm:gap-2 justify-between">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  q.status === "Approved" ? "bg-success/15 text-success" :
                  q.status === "Sent to Client" ? "bg-primary/15 text-primary" :
                  "bg-muted text-muted-foreground border border-border"
                }`}>
                  {q.status}
                </span>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Est. Total Amount</p>
                  <p className="text-xs font-bold text-foreground">{q.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
