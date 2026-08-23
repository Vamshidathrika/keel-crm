"use client";

import React, { useState } from "react";
import { Ship, Search, Plus, MapPin, Calendar, DollarSign, ArrowRight, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShipmentsClientProps {
  user: any;
}

const INITIAL_SHIPMENTS = [
  {
    id: "SH-101",
    dealName: "500t Copper Ore - Valparaiso to Mumbai",
    carrier: "Maersk Line",
    origin: "Valparaiso, Chile",
    destination: "Mumbai, India",
    eta: "2026-08-05",
    status: "In Transit",
    mode: "Ocean Freight",
    cost: "₹18,50,000",
  },
  {
    id: "SH-102",
    dealName: "Electronics Batch C - Shenzhen to Bangalore",
    carrier: "DHL Express",
    origin: "Shenzhen, China",
    destination: "Bangalore, India",
    eta: "2026-07-20",
    status: "Arrived Port",
    mode: "Air Cargo",
    cost: "₹4,20,000",
  },
  {
    id: "SH-103",
    dealName: "Industrial Machinery Parts - Stuttgart to Chennai",
    carrier: "Hapag-Lloyd",
    origin: "Hamburg, Germany",
    destination: "Chennai, India",
    eta: "2026-08-12",
    status: "Booking Confirmed",
    mode: "Ocean Freight",
    cost: "₹12,80,000",
  },
];

export default function ShipmentsClient({ user }: ShipmentsClientProps) {
  const [shipments, setShipments] = useState(INITIAL_SHIPMENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({
    dealName: "",
    carrier: "",
    origin: "",
    destination: "",
    eta: "",
    status: "Booking Confirmed",
    mode: "Ocean Freight",
    cost: "",
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.dealName || !newForm.origin || !newForm.destination) return;
    const newShipment = {
      id: `SH-${Math.floor(100 + Math.random() * 900)}`,
      ...newForm,
    };
    setShipments([newShipment, ...shipments]);
    setShowAdd(false);
    setNewForm({
      dealName: "",
      carrier: "",
      origin: "",
      destination: "",
      eta: "",
      status: "Booking Confirmed",
      mode: "Ocean Freight",
      cost: "",
    });
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
