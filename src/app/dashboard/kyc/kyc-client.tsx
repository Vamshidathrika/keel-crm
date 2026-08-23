"use client";

import React, { useState } from "react";
import { CreditCard, Plus, Search, Calendar, User, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KycClientProps {
  user: any;
}

const INITIAL_KYC_RECORDS = [
  {
    id: "KYC-901",
    customer: "Vamsi Krishna",
    docType: "PAN Card + Aadhaar",
    complianceStatus: "Approved",
    regulatoryLogs: "SEBI Compliance verified on 2026-07-12",
    updatedAt: "2026-07-12",
  },
  {
    id: "KYC-902",
    customer: "Meenakshi Exports Ltd.",
    docType: "Corporate GSTIN + MOA",
    complianceStatus: "Pending Review",
    regulatoryLogs: "Uploaded on 2026-07-16, awaiting audit",
    updatedAt: "2026-07-16",
  },
  {
    id: "KYC-903",
    customer: "Ramanathan Iyer",
    docType: "Passport Verification",
    complianceStatus: "Rejected",
    regulatoryLogs: "Image resolution low. Re-request dispatched",
    updatedAt: "2026-07-10",
  },
];

export default function KycClient({ user }: KycClientProps) {
  const [kycRecords, setKycRecords] = useState(INITIAL_KYC_RECORDS);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({
    customer: "",
    docType: "PAN Card + Aadhaar",
    complianceStatus: "Pending Review",
    regulatoryLogs: "New document uploaded. Awaiting compliance validation.",
    updatedAt: new Date().toISOString().split("T")[0],
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.customer || !newForm.docType) return;
    const newKyc = {
      id: `KYC-${Math.floor(900 + Math.random() * 100)}`,
      ...newForm,
    };
    setKycRecords([newKyc, ...kycRecords]);
    setShowAdd(false);
    setNewForm({
      customer: "",
      docType: "PAN Card + Aadhaar",
      complianceStatus: "Pending Review",
      regulatoryLogs: "New document uploaded. Awaiting compliance validation.",
      updatedAt: new Date().toISOString().split("T")[0],
    });
  };

  const filtered = kycRecords.filter(
    (k) =>
      k.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.docType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> KYC Compliance
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Financial Services Vertical — Oversee client Know-Your-Customer verification pipelines, KYC document reviews, SEBI/RBI audit compliance logs, and risk statuses.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Log KYC
        </Button>
      </div>

      {showAdd && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold">New Document Verification</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Register uploaded client identity files and assign verification statuses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Client Name</label>
                  <Input
                    placeholder="Customer or Corporate name"
                    value={newForm.customer}
                    onChange={(e) => setNewForm({ ...newForm, customer: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Identity Document Type</label>
                  <Input
                    placeholder="e.g. PAN Card, GSTIN Certificate"
                    value={newForm.docType}
                    onChange={(e) => setNewForm({ ...newForm, docType: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold">Regulatory Log / Remarks</label>
                  <Input
                    placeholder="Describe verification remarks"
                    value={newForm.regulatoryLogs}
                    onChange={(e) => setNewForm({ ...newForm, regulatoryLogs: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Verification Stage</label>
                  <select
                    value={newForm.complianceStatus}
                    onChange={(e) => setNewForm({ ...newForm, complianceStatus: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option>Pending Review</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit">Publish KYC Log</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search verified client..."
            className="pl-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((k) => (
          <Card key={k.id} className="border border-border bg-card">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {k.id}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Docs: {k.docType}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-1">{k.customer}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" /> {k.regulatoryLogs}
                </p>
              </div>

              <div className="flex sm:flex-col items-end gap-4 sm:gap-2 justify-between">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  k.complianceStatus === "Approved" ? "bg-success/15 text-success" :
                  k.complianceStatus === "Pending Review" ? "bg-ai/15 text-ai" :
                  "bg-destructive/15 text-destructive animate-pulse"
                }`}>
                  {k.complianceStatus === "Approved" && <CheckCircle2 className="w-3 h-3" />}
                  {k.complianceStatus === "Rejected" && <AlertTriangle className="w-3 h-3" />}
                  {k.complianceStatus}
                </span>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Compliance Date</p>
                  <p className="text-xs font-semibold flex items-center gap-1 justify-end mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {k.updatedAt}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
