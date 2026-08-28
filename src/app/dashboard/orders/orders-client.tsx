"use client";

import React, { useState } from "react";
import { ShoppingCart, Plus, Search, Calendar, User, Package, DollarSign, Star } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createOrder, updateOrderStatus } from "@/app/actions/orders";
import { toast } from "sonner";

interface OrdersClientProps {
  user: any;
  initialOrders?: any[];
}

export default function OrdersClient({ user, initialOrders = [] }: OrdersClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [newForm, setNewForm] = useState({
    customer: "",
    items: "Standard Enterprise Package",
    amount: "₹45,000",
    status: "Fulfillment",
    clvScore: "Hot (Top 10%)",
    date: new Date().toISOString().slice(0, 10),
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.customer || !newForm.items || !newForm.amount) {
      toast.error("Please fill in customer, items and amount.");
      return;
    }
    setIsPending(true);
    try {
      const created = await createOrder({
        clientName: newForm.customer,
        itemsSummary: newForm.items,
        totalAmount: newForm.amount,
        fulfillmentStatus: newForm.status,
      });
      setOrders([
        {
          id: created.orderNumber,
          customer: created.clientName,
          items: created.itemsSummary,
          amount: created.totalAmount,
          status: created.fulfillmentStatus,
          clvScore: newForm.clvScore,
          date: created.createdAt ? new Date(created.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        },
        ...orders,
      ]);
      setShowAdd(false);
      toast.success("Order recorded in database successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setIsPending(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateOrderStatus(id, status);
      setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));
      toast.success(`Updated order status to "${status}"`);
    } catch (err: any) {
      toast.error("Failed to update order status");
    }
  };

  const filtered = orders.filter(
    (o) =>
      (o.customer || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.items || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.id || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" /> E-commerce Orders
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            E-commerce Vertical — Track D2C & marketplace order fulfillment statuses, transaction logs, and customer Lifetime Value (LTV) indices.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Log Order
        </Button>
      </div>

      {showAdd && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Record Customer Order</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter order line items, transaction totals, and update the customer score.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Customer Name</label>
                  <Input
                    placeholder="Customer full name"
                    value={newForm.customer}
                    onChange={(e) => setNewForm({ ...newForm, customer: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Line Items (Products)</label>
                  <Input
                    placeholder="e.g. Leather Jacket x1, Cap x1"
                    value={newForm.items}
                    onChange={(e) => setNewForm({ ...newForm, items: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Order Total (₹)</label>
                  <Input
                    placeholder="e.g. ₹15,499"
                    value={newForm.amount}
                    onChange={(e) => setNewForm({ ...newForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Order Date</label>
                  <Input
                    type="date"
                    value={newForm.date}
                    onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Fulfillment Status</label>
                  <select
                    value={newForm.status}
                    onChange={(e) => setNewForm({ ...newForm, status: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option>Fulfillment</option>
                    <option>In Transit</option>
                    <option>Delivered</option>
                    <option>Returned</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Customer Value Band</label>
                  <select
                    value={newForm.clvScore}
                    onChange={(e) => setNewForm({ ...newForm, clvScore: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option>Warm</option>
                    <option>Hot (Top 10%)</option>
                    <option>Hot (Top 5%)</option>
                    <option>Cold Account</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit">Record Order</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order or buyer..."
            className="pl-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((o) => (
          <Card key={o.id} className="border border-border bg-card">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {o.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    o.clvScore.includes("5%") ? "bg-success/10 text-success border border-success/20" :
                    o.clvScore.includes("10%") ? "bg-ai/10 text-ai border border-ai/20" :
                    "bg-muted text-muted-foreground border border-border"
                  }`}>
                    <Star className="w-3 h-3 fill-current" />
                    CLV: {o.clvScore}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-1">{o.customer}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> {o.items}
                </p>
              </div>

              <div className="flex sm:flex-col items-end gap-4 sm:gap-2 justify-between">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  o.status === "Delivered" ? "bg-success/15 text-success" :
                  o.status === "In Transit" ? "bg-primary/15 text-primary" :
                  "bg-muted text-muted-foreground border border-border"
                }`}>
                  {o.status}
                </span>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Order Date / Total</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {o.date} • <span className="text-primary">{o.amount}</span>
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
