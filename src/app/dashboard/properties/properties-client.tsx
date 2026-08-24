"use client";

import React, { useState } from "react";
import { Home, Plus, Search, MapPin, Tag, User, DollarSign, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createProperty, updatePropertyStatus } from "@/app/actions/properties";
import { toast } from "sonner";

interface PropertiesClientProps {
  user: any;
  initialProperties?: any[];
}

export default function PropertiesClient({ user, initialProperties = [] }: PropertiesClientProps) {
  const [properties, setProperties] = useState(initialProperties);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [newForm, setNewForm] = useState({
    title: "",
    location: "",
    price: "₹1,50,00,000",
    status: "Active Listing",
    size: "2,400 sqft",
    type: "Commercial",
    agent: user.name || "Agent",
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title || !newForm.location || !newForm.price) {
      toast.error("Please fill in title, location and price.");
      return;
    }
    setIsPending(true);
    try {
      const created = await createProperty({
        title: newForm.title,
        location: newForm.location,
        price: newForm.price,
        type: newForm.type,
        status: newForm.status,
      });
      setProperties([
        {
          id: created.id,
          title: created.title,
          location: created.location,
          price: created.price,
          status: created.status,
          size: newForm.size,
          type: created.type,
          agent: user.name || "Agent",
        },
        ...properties,
      ]);
      setShowAdd(false);
      toast.success("Property added to database successfully!");
      setNewForm({
        title: "",
        location: "",
        price: "₹1,50,00,000",
        status: "Active Listing",
        size: "2,400 sqft",
        type: "Commercial",
        agent: user.name || "Agent",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create property");
    } finally {
      setIsPending(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updatePropertyStatus(id, status);
      setProperties(properties.map((p) => (p.id === id ? { ...p, status } : p)));
      toast.success(`Updated property status to "${status}"`);
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  const filtered = properties.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Home className="w-6 h-6 text-primary" /> Property Listings
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real Estate Vertical — Track residential & commercial property portfolios, transactions, and site visit schedules.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Add Listing
        </Button>
      </div>

      {showAdd && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Log New Listing</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter property specifications and catalog pricing details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Listing Title</label>
                  <Input
                    placeholder="e.g. Luxury 4BHK Gated Villa"
                    value={newForm.title}
                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Location / Address</label>
                  <Input
                    placeholder="e.g. Kokapet, Hyderabad"
                    value={newForm.location}
                    onChange={(e) => setNewForm({ ...newForm, location: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Price</label>
                  <Input
                    placeholder="e.g. ₹2,50,00,000"
                    value={newForm.price}
                    onChange={(e) => setNewForm({ ...newForm, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Size (Built-up area)</label>
                  <Input
                    placeholder="e.g. 3,500 sqft"
                    value={newForm.size}
                    onChange={(e) => setNewForm({ ...newForm, size: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Segment Type</label>
                  <select
                    value={newForm.type}
                    onChange={(e) => setNewForm({ ...newForm, type: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option>Residential</option>
                    <option>Commercial</option>
                    <option>Plots / Land</option>
                    <option>Industrial</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Listing Status</label>
                  <select
                    value={newForm.status}
                    onChange={(e) => setNewForm({ ...newForm, status: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option>Active Listing</option>
                    <option>Under Offer</option>
                    <option>Sold</option>
                    <option>Draft</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit">Publish Listing</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            className="pl-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-32 bg-muted flex items-center justify-center relative">
              <span className="text-4xl">🏠</span>
              <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                p.status === "Active Listing" ? "bg-success/15 text-success" :
                p.status === "Under Offer" ? "bg-ai/15 text-ai" :
                "bg-muted text-muted-foreground border border-border"
              }`}>
                {p.status}
              </span>
            </div>
            <CardContent className="p-4 space-y-3">
              <div>
                <span className="text-[10px] text-muted-foreground font-mono">{p.id} • {p.type}</span>
                <h3 className="text-xs font-bold text-foreground line-clamp-1 mt-0.5">{p.title}</h3>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {p.location}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Price</p>
                  <p className="text-xs font-bold text-primary">{p.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Size</p>
                  <p className="text-xs font-semibold">{p.size}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
