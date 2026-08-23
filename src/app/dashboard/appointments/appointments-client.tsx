"use client";

import React, { useState } from "react";
import { Calendar, Plus, Search, User, Clock, AlertCircle, ShieldAlert, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AppointmentsClientProps {
  user: any;
}

const INITIAL_APPOINTMENTS = [
  {
    id: "APT-201",
    patientName: "Rajesh Y.",
    provider: "Dr. K. Srinivas (Cardiology)",
    dateTime: "2026-07-20T10:30",
    status: "Scheduled",
    hipaaConsent: true,
    referralSource: "Apollo General Clinic",
  },
  {
    id: "APT-202",
    patientName: "Anitha Chenoy",
    provider: "Dr. L. Prathyusha (Pediatrics)",
    dateTime: "2026-07-18T14:15",
    status: "Completed",
    hipaaConsent: true,
    referralSource: "Website Portal",
  },
  {
    id: "APT-203",
    patientName: "Vikram Malhotra",
    provider: "Dr. K. Srinivas (Cardiology)",
    dateTime: "2026-07-22T09:00",
    status: "Requested",
    hipaaConsent: false,
    referralSource: "Dr. Malhotra (Self Referral)",
  },
];

export default function AppointmentsClient({ user }: AppointmentsClientProps) {
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({
    patientName: "",
    provider: "",
    dateTime: "",
    status: "Scheduled",
    hipaaConsent: true,
    referralSource: "",
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.patientName || !newForm.provider || !newForm.dateTime) return;
    const newApt = {
      id: `APT-${Math.floor(200 + Math.random() * 800)}`,
      ...newForm,
    };
    setAppointments([newApt, ...appointments]);
    setShowAdd(false);
    setNewForm({
      patientName: "",
      provider: "",
      dateTime: "",
      status: "Scheduled",
      hipaaConsent: true,
      referralSource: "",
    });
  };

  const filtered = appointments.filter(
    (a) =>
      a.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" /> Patient Appointments
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Healthcare Vertical — Manage scheduled visits, physician clinical departments, referral loops, and HIPAA compliance consent flags.
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Log Appointment
        </Button>
      </div>

      {showAdd && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Schedule Appointment</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter patient intake info, physician assignments, and check consent flags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Patient Name</label>
                  <Input
                    placeholder="Patient full name"
                    value={newForm.patientName}
                    onChange={(e) => setNewForm({ ...newForm, patientName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Referral Source</label>
                  <Input
                    placeholder="e.g. Clinic name or Website"
                    value={newForm.referralSource}
                    onChange={(e) => setNewForm({ ...newForm, referralSource: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Assigned Physician & Clinic</label>
                  <Input
                    placeholder="e.g. Dr. Verma (Neurology)"
                    value={newForm.provider}
                    onChange={(e) => setNewForm({ ...newForm, provider: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Appointment Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={newForm.dateTime}
                    onChange={(e) => setNewForm({ ...newForm, dateTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5 flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={newForm.hipaaConsent}
                    onChange={(e) => setNewForm({ ...newForm, hipaaConsent: e.target.checked })}
                    className="w-4 h-4 text-primary rounded border-input"
                  />
                  <label htmlFor="consent" className="text-xs font-semibold select-none cursor-pointer">
                    HIPAA Compliance Consent Signed
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit">Book Appointment</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patient record..."
            className="pl-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((a) => (
          <Card key={a.id} className="border border-border bg-card">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {a.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    a.hipaaConsent ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive animate-pulse"
                  }`}>
                    {a.hipaaConsent ? <CheckCircle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    {a.hipaaConsent ? "Consent Signed" : "Action Required: No HIPAA Consent"}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-1">{a.patientName}</h3>
                <p className="text-xs text-muted-foreground">{a.provider}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Referral: {a.referralSource || "Direct intake"}</p>
              </div>

              <div className="flex sm:flex-col items-end gap-4 sm:gap-2 justify-between">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  a.status === "Scheduled" ? "bg-primary/15 text-primary" :
                  a.status === "Completed" ? "bg-success/15 text-success" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {a.status}
                </span>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Scheduled Date/Time</p>
                  <p className="text-xs font-semibold flex items-center gap-1 justify-end mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {a.dateTime.replace("T", " ")}
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
