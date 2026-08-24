"use client";

import React, { useState } from "react";
import { FileText, Plus, Search, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createQuote, updateQuoteStatus } from "@/app/actions/quotes";
import { QuotesTable } from "@/components/quotes/quotes-table";

interface QuotesClientProps {
  user: any;
  initialQuotes: any[];
}

export default function QuotesClient({ user, initialQuotes }: QuotesClientProps) {
  const [quotes, setQuotes] = useState(initialQuotes || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newForm, setNewForm] = useState({
    title: "",
    clientName: "",
    amount: "",
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title || !newForm.clientName || !newForm.amount) return;

    setLoading(true);
    try {
      const created = await createQuote({
        title: newForm.title,
        clientName: newForm.clientName,
        amount: Number(newForm.amount),
      });

      setQuotes([created, ...quotes]);
      setShowAdd(false);
      setNewForm({ title: "", clientName: "", amount: "" });
    } catch (err) {
      console.error("Failed to create quotation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: "draft" | "sent" | "accepted" | "rejected") => {
    try {
      await updateQuoteStatus(id, status);
      setQuotes(quotes.map((q) => (q.id === id ? { ...q, status } : q)));
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const filtered = quotes.filter(
    (q) =>
      q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            CPQ & Quotations
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate, approve, and track custom quotes, bill of materials, and engineering pricing.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Quote
        </Button>
      </div>

      {/* Add Quotation Form */}
      {showAdd && (
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">New Engineering Quotation</CardTitle>
            <CardDescription className="text-xs">
              Generate a configure-price-quote draft with line items and customer pricing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Quote Title / Scope</label>
                  <Input
                    required
                    placeholder="e.g. Multi-Year Cloud License"
                    value={newForm.title}
                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Customer / Account</label>
                  <Input
                    required
                    placeholder="e.g. Acme Enterprises Ltd."
                    value={newForm.clientName}
                    onChange={(e) => setNewForm({ ...newForm, clientName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Total Quote Amount (₹)</label>
                  <Input
                    required
                    type="number"
                    placeholder="500000"
                    value={newForm.amount}
                    onChange={(e) => setNewForm({ ...newForm, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Quotation
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search & List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Active Quotations</CardTitle>
              <CardDescription className="text-xs">
                {quotes.length} total quotations recorded in database
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search quotations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <QuotesTable quotes={filtered} onStatusUpdate={handleStatusUpdate} />
        </CardContent>
      </Card>
    </div>
  );
}
