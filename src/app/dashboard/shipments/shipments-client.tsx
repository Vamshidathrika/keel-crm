"use client";

import React, { useState } from "react";
import { Ship, Search, Plus, MapPin, Calendar, DollarSign, ArrowRight, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createShipment, updateShipmentStatus } from "@/app/actions/shipments";
import { toast } from "sonner";

interface ShipmentsClientProps {
  user: any;
  initialShipments?: any[];
}

export default function ShipmentsClient({ user, initialShipments = [] }: ShipmentsClientProps) {
  const [shipments, setShipments] = useState(initialShipments);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [newForm, setNewForm] = useState(() => ({
    dealName: "",
    carrier: "Maersk Line",
    origin: "",
    destination: "",
    eta: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: "Booking Confirmed",
    mode: "Ocean Freight",
    cost: "₹10,00,000",
  }));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.dealName || !newForm.origin || !newForm.destination) {
      toast.error("Please fill in deal name, origin and destination.");
      return;
    }
    setIsPending(true);
    try {
      const created = await createShipment(newForm);
      setShipments([created, ...shipments]);
      setShowAdd(false);
      toast.success("Shipment recorded in database successfully!");
      setNewForm({
        dealName: "",
        carrier: "Maersk Line",
        origin: "",
        destination: "",
        eta: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: "Booking Confirmed",
        mode: "Ocean Freight",
        cost: "₹10,00,000",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create shipment");
    } finally {
      setIsPending(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateShipmentStatus(id, status);
      setShipments(shipments.map((s) => (s.id === id ? { ...s, status } : s)));
      toast.success(`Updated shipment status to "${status}"`);
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  const filtered = shipments.filter(
    (s) =>
      s.dealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.carrier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Ship className="w-6 h-6 text-primary" /> Shipment Tracker
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Logistics Vertical — Track active shipments, booking confirmation, ocean/air cargo ETAs.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Log Shipment
        </Button>
      </div>

      {showAdd && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold">New Shipment Dispatch</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter carrier particulars and dispatch details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Deal / Cargo Name</label>
                  <Input
                    placeholder="e.g. Copper Scrap cargo"
                    value={newForm.dealName}
                    onChange={(e) => setNewForm({ ...newForm, dealName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Carrier / Transporter</label>
                  <Input
                    placeholder="e.g. Maersk, DHL"
                    value={newForm.carrier}
                    onChange={(e) => setNewForm({ ...newForm, carrier: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Origin Location</label>
                  <Input
                    placeholder="City, Country or Port"
                    value={newForm.origin}
                    onChange={(e) => setNewForm({ ...newForm, origin: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Destination Location</label>
                  <Input
                    placeholder="City, Country or Port"
                    value={newForm.destination}
                    onChange={(e) => setNewForm({ ...newForm, destination: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Estimated Arrival (ETA)</label>
                  <Input
                    type="date"
                    value={newForm.eta}
                    onChange={(e) => setNewForm({ ...newForm, eta: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Mode of Transit</label>
                  <select
                    value={newForm.mode}
                    onChange={(e) => setNewForm({ ...newForm, mode: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option>Ocean Freight</option>
                    <option>Air Cargo</option>
                    <option>Road Transport</option>
                    <option>Rail Freight</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Shipment</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter shipments..."
            className="pl-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((s) => (
          <Card key={s.id} className="border border-border bg-card">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {s.id}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {s.mode}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground mt-1">{s.dealName}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="font-semibold">{s.carrier}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {s.origin}
                    </span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {s.destination}
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end gap-4 sm:gap-2 justify-between">
                  <div className="flex items-center gap-1.5">
                    {s.status === "In Transit" && <Clock className="w-4 h-4 text-primary animate-pulse" />}
                    {s.status === "Arrived Port" && <CheckCircle2 className="w-4 h-4 text-success" />}
                    {s.status === "Booking Confirmed" && <Clock className="w-4 h-4 text-muted-foreground" />}
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      s.status === "In Transit" ? "bg-primary/10 text-primary" :
                      s.status === "Arrived Port" ? "bg-success/10 text-success" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">ETA</p>
                    <p className="text-xs font-semibold flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5" /> {s.eta}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
