"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  X,
  Trash2,
  Flame,
  Sun,
  Snowflake,
  TrendingUp,
  Building2,
  Clock,
  PlusCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createContact, updateContact, deleteContact, getContactById } from "@/app/actions/contacts";
import { createActivity } from "@/app/actions/activities";
import { analyzeTranscript, draftFollowUp, runLeadScoring } from "@/app/actions/ai";
import { getCustomFieldDefinitions } from "@/app/actions/custom-fields";
import { DynamicFieldRenderer } from "@/components/custom-fields/dynamic-field-renderer";
import { CustomFieldDefinition } from "@/db/schema";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const ActivityTimeline = dynamic(() => import("@/components/activity-timeline"), { ssr: false });
const ImportWizard = dynamic(() => import("@/components/import-wizard"), { ssr: false });

type Contact = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp?: string | null;
  title: string | null;
  department?: string | null;
  seniorityLevel?: string | null;
  buyingRole?: string | null;
  preferredChannel?: string | null;
  linkedinUrl?: string | null;
  timezone?: string | null;
  city: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  companyId: string | null;
  source: string;
  ownerId: string | null;
  tags: string[];
  customFields: Record<string, string>;
  score: number;
  scoreBreakdown: any | null;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
  } | null;
};

type Company = {
  id: string;
  name: string;
};

interface ContactsClientProps {
  initialContacts: Contact[];
  companies: Company[];
  currentUser: any;
}

export default function ContactsClient({
  initialContacts,
  companies,
  currentUser,
}: ContactsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [query, setQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [timelineRefresh, setTimelineRefresh] = useState(0);

  // Note composition states
  const [noteBody, setNoteBody] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  // Transcript analysis states
  const [transcriptInput, setTranscriptInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [scoring, setScoring] = useState(false);

  // Follow-up Drafting states
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftChannel, setDraftChannel] = useState<"email" | "whatsapp" | null>(null);
  const [draftText, setDraftText] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [loggingDraft, setLoggingDraft] = useState(false);

  // CSV Import/Export states
  const [showImportWizard, setShowImportWizard] = useState(false);

  // New Contact states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [contactCustomFields, setContactCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [createForm, setCreateForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    whatsapp: string;
    title: string;
    department: string;
    seniorityLevel: string;
    buyingRole: string;
    linkedinUrl: string;
    city: string;
    state: string;
    country: string;
    companyId: string;
    customFields: Record<string, any>;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    whatsapp: "",
    title: "",
    department: "",
    seniorityLevel: "",
    buyingRole: "",
    linkedinUrl: "",
    city: "",
    state: "",
    country: "",
    companyId: "none",
    customFields: {},
  });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    getCustomFieldDefinitions("contact")
      .then((defs) => setContactCustomFields(defs))
      .catch(() => {});
  }, [showCreateDialog]);

  // Tag creation state in Drawer
  const [newTagInput, setNewTagInput] = useState("");

  // Sync highlight contact from URL parameter
  useEffect(() => {
    if (highlightId) {
      const match = contacts.find((c) => c.id === highlightId);
      if (match) {
        const timer = setTimeout(() => {
          setSelectedContact(match);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightId, contacts]);

  const filteredContacts = contacts.filter((c) => {
    const q = (query || "").toLowerCase();
    const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
    const email = (c.email || "").toLowerCase();
    const phone = (c.phone || "").toLowerCase();
    const companyName = (c.company?.name || "").toLowerCase();
    const tags = Array.isArray(c.tags) ? c.tags.map((t) => (t || "").toLowerCase()) : [];

    return (
      fullName.includes(q) ||
      email.includes(q) ||
      phone.includes(q) ||
      companyName.includes(q) ||
      tags.some((t) => t.includes(q))
    );
  });

  const getScoreBadge = (score: number) => {
    if (score >= 75) {
      return {
        label: "Hot",
        Icon: Flame,
        classes: "text-ai bg-ai/10 border-ai/30 font-semibold",
      };
    }
    if (score >= 45) {
      return {
        label: "Warm",
        Icon: Sun,
        classes: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      };
    }
    return {
      label: "Cold",
      Icon: Snowflake,
      classes: "text-info bg-info/10 border-info/30",
    };
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.firstName.trim()) {
      toast.error("First Name is required");
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        firstName: createForm.firstName,
        lastName: createForm.lastName || undefined,
        email: createForm.email || undefined,
        phone: createForm.phone || undefined,
        whatsapp: createForm.whatsapp || undefined,
        title: createForm.title || undefined,
        department: createForm.department || undefined,
        seniorityLevel: (createForm.seniorityLevel as any) || undefined,
        buyingRole: (createForm.buyingRole as any) || undefined,
        linkedinUrl: createForm.linkedinUrl || undefined,
        city: createForm.city || undefined,
        state: createForm.state || undefined,
        country: createForm.country || undefined,
        companyId: createForm.companyId === "none" ? undefined : createForm.companyId,
        tags: [],
        customFields: createForm.customFields,
      };

      const newContact = await createContact(payload);
      const linkedCompany = companies.find((co) => co.id === newContact.companyId);

      const contactWithCompany: Contact = {
        ...newContact,
        company: linkedCompany ? { id: linkedCompany.id, name: linkedCompany.name } : null,
      };

      setContacts((prev) => [contactWithCompany, ...prev]);
      setShowCreateDialog(false);
      setCreateForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        whatsapp: "",
        title: "",
        department: "",
        seniorityLevel: "",
        buyingRole: "",
        linkedinUrl: "",
        city: "",
        state: "",
        country: "",
        companyId: "none",
        customFields: {},
      });
      toast.success("Contact created successfully");
      setSelectedContact(contactWithCompany);
    } catch (err: any) {
      toast.error(err.message || "Failed to create contact");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLogNote = async () => {
    if (!selectedContact || !noteBody.trim()) return;
    setNoteLoading(true);
    try {
      await createActivity({
        type: "note",
        body: noteBody.trim(),
        relatedContactId: selectedContact.id,
      });

      setNoteBody("");
      setTimelineRefresh((prev) => prev + 1);
      toast.success("Timeline log recorded");
    } catch (err: any) {
      toast.error(err.message || "Failed to record log");
    } finally {
      setNoteLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!selectedContact || !newTagInput.trim()) return;
    const tag = newTagInput.trim().toLowerCase();

    if (selectedContact.tags.includes(tag)) {
      setNewTagInput("");
      return;
    }

    const updatedTags = [...selectedContact.tags, tag];
    try {
      const updated = await updateContact(selectedContact.id, { tags: updatedTags });
      const fullUpdated = { ...selectedContact, tags: updated.tags };
      setSelectedContact(fullUpdated);
      setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? fullUpdated : c)));
      setNewTagInput("");
      toast.success("Tag added");
    } catch (err: any) {
      toast.error(err.message || "Failed to update tags");
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedContact) return;
    const updatedTags = selectedContact.tags.filter((t) => t !== tag);

    try {
      const updated = await updateContact(selectedContact.id, { tags: updatedTags });
      const fullUpdated = { ...selectedContact, tags: updated.tags };
      setSelectedContact(fullUpdated);
      setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? fullUpdated : c)));
      toast.success("Tag removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to update tags");
    }
  };

  const handleAnalyzeTranscript = async () => {
    if (!selectedContact || !transcriptInput.trim()) return;
    setAnalyzing(true);
    try {
      await analyzeTranscript(selectedContact.id, transcriptInput.trim());
      toast.success("Transcript analyzed. Timeline summary and action item tasks created.");
      setTranscriptInput("");
      setTimelineRefresh((prev) => prev + 1);

      const freshContact = await getContactById(selectedContact.id);
      if (freshContact) {
        setSelectedContact(freshContact as Contact);
        setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? (freshContact as Contact) : c)));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze transcript");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualScore = async () => {
    if (!selectedContact) return;
    setScoring(true);
    try {
      await runLeadScoring(selectedContact.id);
      toast.success("Lead score re-calculated!");
      
      const freshContact = await getContactById(selectedContact.id);
      if (freshContact) {
        setSelectedContact(freshContact as Contact);
        setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? (freshContact as Contact) : c)));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to score lead");
    } finally {
      setScoring(false);
    }
  };

  const handleImportComplete = (newContactsList: any[]) => {
    const formatted = newContactsList.map((nc) => {
      const co = companies.find((company) => company.id === nc.companyId);
      return {
        ...nc,
        company: co ? { id: co.id, name: co.name } : null,
      };
    });
    setContacts((prev) => [...formatted, ...prev]);
  };

  const handleExportCSV = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Title", "City", "Score"];
    const rows = contacts.map((c) => [
      c.firstName,
      c.lastName || "",
      c.email || "",
      c.phone || "",
      c.title || "",
      c.city || "",
      c.score,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((val) => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `keel_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully!");
  };

  const handleGenerateDraft = async (channel: "email" | "whatsapp") => {
    if (!selectedContact) return;
    setDrafting(true);
    try {
      const res = await draftFollowUp(selectedContact.id, channel);
      setDraftText(res.draft);
      setDraftChannel(channel);
      setShowDraftDialog(true);
    } catch (err: any) {
      toast.error("Failed to generate follow-up draft");
    } finally {
      setDrafting(false);
    }
  };

  const handleLogDraftToTimeline = async () => {
    if (!selectedContact || !draftText.trim()) return;
    setLoggingDraft(true);
    try {
      await createActivity({
        type: draftChannel === "email" ? "email" : "whatsapp",
        body: `AI Draft Follow-up:\n${draftText}`,
        relatedContactId: selectedContact.id,
      });
      toast.success("AI draft logged to activity timeline!");
      setTimelineRefresh((prev) => prev + 1);
      setShowDraftDialog(false);
    } catch (err: any) {
      toast.error("Failed to log activity");
    } finally {
      setLoggingDraft(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact? All timeline activities will be permanently deleted.")) {
      return;
    }

    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (selectedContact?.id === id) {
        setSelectedContact(null);
        router.push("/dashboard/contacts");
      }
      toast.success("Contact deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete contact");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Key Stakeholders & Contacts
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Executive stakeholder relationship directory, predictive ICP lead scoring, and unified communication forensics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="text-xs">
            Export Roster
          </Button>
          <Button variant="outline" onClick={() => setShowImportWizard(true)} className="text-xs">
            Bulk Import CSV
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-1.5 text-xs">
            <Plus className="w-4 h-4" /> Enroll Key Stakeholder
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Executive Network", value: contacts.length, icon: Users, color: "text-primary bg-primary/10" },
          { label: "High-Intent (Score 75+)", value: contacts.filter((c) => c.score >= 75).length, icon: Flame, color: "text-ai bg-ai/10 border-ai/10" },
          { label: "Active Nurture (45-74)", value: contacts.filter((c) => c.score >= 45 && c.score < 75).length, icon: Sun, color: "text-amber-500 bg-amber-500/10" },
          { label: "Dormant / Pipeline Reserve", value: contacts.filter((c) => c.score < 45).length, icon: Snowflake, color: "text-info bg-info/10" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg border border-transparent ${s.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, email, tags, or company..."
          className="pl-9 bg-card border-border placeholder:text-muted-foreground/70"
        />
      </div>

      {/* Contacts Grid Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Lead Score</th>
              <th className="px-4 py-3 font-semibold">Contact Details</th>
              <th className="px-4 py-3 font-semibold">City</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredContacts.map((c) => {
              const badge = getScoreBadge(c.score);
              const BadgeIcon = badge.Icon;
              return (
                <tr
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {c.firstName} {c.lastName || ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.title || "—"}</td>
                  <td className="px-4 py-3">
                    {c.company ? (
                      <span className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Building2 className="w-3 h-3" />
                        {c.company.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">Unlinked</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] ${badge.classes}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      {c.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    <div className="space-y-0.5">
                      {c.email && <div className="flex items-center gap-1 text-[11px]"><Mail className="w-3 h-3" /> {c.email}</div>}
                      {c.phone && <div className="flex items-center gap-1 text-[11px]"><Phone className="w-3 h-3" /> {c.phone}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.city || "—"}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/dashboard/contacts/${c.id}`}>
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-6 text-[10px] gap-1 text-primary hover:bg-primary/10"
                        >
                          <Sparkles className="w-3 h-3 text-primary" />
                          360° Hub
                        </Button>
                      </Link>
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredContacts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No contacts found. Add a contact or refine your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Create a new contact in your sales workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateContact} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  placeholder="e.g. John"
                  disabled={createLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  placeholder="e.g. Doe"
                  disabled={createLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="john@company.com"
                disabled={createLoading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Phone (E.164)</Label>
              <Input
                id="phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="e.g. +919900077000"
                disabled={createLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Operations Manager"
                  disabled={createLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={createForm.city}
                  onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  disabled={createLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="company">Company</Label>
              <Select
                value={createForm.companyId}
                onValueChange={(val) => setCreateForm({ ...createForm, companyId: val as string })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Link a company" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">Unlinked / None</SelectItem>
                  {companies.map((co) => (
                    <SelectItem key={co.id} value={co.id}>
                      {co.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional Enterprise Details & Qualification */}
            <details className="group border border-border/80 rounded-lg p-3 bg-muted/20 text-xs">
              <summary className="font-semibold text-foreground cursor-pointer flex items-center justify-between select-none py-0.5">
                <span className="flex items-center gap-1.5 text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  More Details &amp; Qualification (Optional)
                </span>
                <span className="text-[10px] text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="whatsapp" className="text-[11px]">WhatsApp (E.164)</Label>
                    <Input
                      id="whatsapp"
                      value={createForm.whatsapp}
                      onChange={(e) => setCreateForm({ ...createForm, whatsapp: e.target.value })}
                      placeholder="+919876543210"
                      className="h-8 text-xs"
                      disabled={createLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="linkedinUrl" className="text-[11px]">LinkedIn URL</Label>
                    <Input
                      id="linkedinUrl"
                      value={createForm.linkedinUrl}
                      onChange={(e) => setCreateForm({ ...createForm, linkedinUrl: e.target.value })}
                      placeholder="linkedin.com/in/username"
                      className="h-8 text-xs"
                      disabled={createLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="buyingRole" className="text-[11px]">Buying Role (MEDDPICC)</Label>
                    <select
                      id="buyingRole"
                      value={createForm.buyingRole}
                      onChange={(e) => setCreateForm({ ...createForm, buyingRole: e.target.value })}
                      className="w-full h-8 text-xs rounded-md border border-border bg-card px-2 text-foreground"
                      disabled={createLoading}
                    >
                      <option value="">Select Buying Role</option>
                      <option value="decision_maker">Decision Maker</option>
                      <option value="champion">Champion</option>
                      <option value="economic_buyer">Economic Buyer</option>
                      <option value="influencer">Influencer</option>
                      <option value="blocker">Blocker</option>
                      <option value="evaluator">Evaluator</option>
                      <option value="end_user">End User</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="seniorityLevel" className="text-[11px]">Seniority Tier</Label>
                    <select
                      id="seniorityLevel"
                      value={createForm.seniorityLevel}
                      onChange={(e) => setCreateForm({ ...createForm, seniorityLevel: e.target.value })}
                      className="w-full h-8 text-xs rounded-md border border-border bg-card px-2 text-foreground"
                      disabled={createLoading}
                    >
                      <option value="">Select Seniority</option>
                      <option value="c_level">C-Level Executive</option>
                      <option value="vp">VP / Head of Dept</option>
                      <option value="director">Director</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff / Contributor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="department" className="text-[11px]">Department</Label>
                    <Input
                      id="department"
                      value={createForm.department}
                      onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                      placeholder="e.g. Procurement, Sales"
                      className="h-8 text-xs"
                      disabled={createLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="state" className="text-[11px]">State / Region</Label>
                    <Input
                      id="state"
                      value={createForm.state}
                      onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                      placeholder="e.g. Telangana, Maharashtra"
                      className="h-8 text-xs"
                      disabled={createLoading}
                    />
                  </div>
                </div>
              </div>
            </details>

            {/* Dynamic Custom Fields on Contacts */}
            <DynamicFieldRenderer
              fields={contactCustomFields}
              values={createForm.customFields}
              onChange={(key, val) =>
                setCreateForm((prev) => ({
                  ...prev,
                  customFields: { ...prev.customFields, [key]: val },
                }))
              }
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateDialog(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Creating..." : "Create Contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Side Drawer Panel */}
      <Sheet open={!!selectedContact} onOpenChange={(o) => { if (!o) setSelectedContact(null); }}>
        {selectedContact && (
          <SheetContent className="w-full sm:max-w-lg bg-card border-l border-border flex flex-col p-0 z-50">
            <SheetHeader className="p-6 border-b border-border bg-muted/20">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <SheetTitle className="text-lg font-bold text-foreground truncate">
                    {selectedContact.firstName} {selectedContact.lastName || ""}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-mono">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedContact.title || "No Title"}
                    {selectedContact.company && (
                      <>
                        {" · "}
                        <span className="text-primary">{selectedContact.company.name}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Link href={`/dashboard/contacts/${selectedContact.id}`}>
                    <button
                      className="h-7 px-2 border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 text-[10px] font-semibold flex items-center gap-1 rounded transition-colors"
                      title="Open Full Customer 360 Hub"
                    >
                      <Sparkles className="w-3 h-3 text-primary" /> 360° Hub
                    </button>
                  </Link>
                  <button
                    onClick={() => handleGenerateDraft("email")}
                    disabled={drafting}
                    className="h-7 px-2 border border-ai/30 text-ai bg-ai/5 hover:bg-ai/10 text-[10px] font-semibold flex items-center gap-1 rounded transition-colors"
                    title="Draft AI Email"
                  >
                    <Sparkles className="w-3 h-3 text-ai" /> Email
                  </button>
                  <button
                    onClick={() => handleGenerateDraft("whatsapp")}
                    disabled={drafting}
                    className="h-7 px-2 border border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-[10px] font-semibold flex items-center gap-1 rounded transition-colors"
                    title="Draft AI WhatsApp"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-500" /> WhatsApp
                  </button>
                </div>
              </div>

              {/* Score breakdown highlight section */}
              {(() => {
                const badge = getScoreBadge(selectedContact.score);
                const BadgeIcon = badge.Icon;
                return (
                  <div className="mt-4 flex flex-col gap-2 p-3 rounded-lg border border-ai/20 bg-ai/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ai font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Lead Score
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${badge.classes}`}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label} ({selectedContact.score})
                      </span>
                    </div>

                    {selectedContact.scoreBreakdown?.recommendation && (
                      <p className="text-[11px] text-muted-foreground mt-1 leading-normal italic">
                        &quot;{selectedContact.scoreBreakdown.recommendation}&quot;
                      </p>
                    )}

                    <div className="mt-2 pt-2 border-t border-ai/10 flex justify-end">
                      <button
                        onClick={handleManualScore}
                        disabled={scoring}
                        className="text-[10px] font-semibold text-ai hover:underline disabled:opacity-50"
                      >
                        {scoring ? "Recalculating..." : "Recalculate AI Score"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Detailed Contact Cards */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Contact Info &amp; Channels
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px]">Email</span>
                    <p className="font-mono text-foreground truncate select-all">
                      {selectedContact.email || "—"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px]">Phone</span>
                    <p className="font-mono text-foreground truncate select-all">
                      {selectedContact.phone || "—"}
                    </p>
                  </div>
                  {selectedContact.whatsapp && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px]">WhatsApp</span>
                      <p className="font-mono text-emerald-500 truncate select-all">
                        {selectedContact.whatsapp}
                      </p>
                    </div>
                  )}
                  {selectedContact.linkedinUrl && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px]">LinkedIn</span>
                      <p className="text-primary truncate">
                        <a href={selectedContact.linkedinUrl.startsWith("http") ? selectedContact.linkedinUrl : `https://${selectedContact.linkedinUrl}`} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          Profile ↗
                        </a>
                      </p>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px]">Location</span>
                    <p className="text-foreground">
                      {[selectedContact.city, selectedContact.state, selectedContact.country].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px]">Source</span>
                    <p className="text-foreground capitalize">{selectedContact.source}</p>
                  </div>
                  {selectedContact.buyingRole && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px]">Buying Role</span>
                      <p className="text-primary font-medium capitalize">
                        {selectedContact.buyingRole.replace(/_/g, " ")}
                      </p>
                    </div>
                  )}
                  {selectedContact.seniorityLevel && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px]">Seniority</span>
                      <p className="text-foreground uppercase font-mono text-[11px]">
                        {selectedContact.seniorityLevel.replace(/_/g, " ")}
                      </p>
                    </div>
                  )}
                  {selectedContact.department && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px]">Department</span>
                      <p className="text-foreground">{selectedContact.department}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {selectedContact.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-muted border border-border text-[10px] text-muted-foreground"
                    >
                      {t}
                      <button
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-destructive text-[11px]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedContact.tags.length === 0 && (
                    <span className="text-xs text-muted-foreground/60 italic">No tags applied</span>
                  )}
                </div>
                <div className="flex gap-1.5 max-w-xs mt-1">
                  <Input
                    placeholder="New tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    className="h-7 text-[11px] px-2"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddTag} className="h-7 px-2">
                    Add
                  </Button>
                </div>
              </div>

              {/* Logger Notes */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Log Timeline Note
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type details to log..."
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogNote()}
                    disabled={noteLoading}
                    className="flex-1 bg-background text-xs"
                  />
                  <Button size="sm" onClick={handleLogNote} disabled={noteLoading}>
                    {noteLoading ? "Logging..." : "Log Note"}
                  </Button>
                </div>
              </div>

              {/* Transcript Paste */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  AI Conversation Intelligence
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Paste a call transcript below to extract action items, summaries, and set tasks automatically.
                </p>
                <div className="space-y-2">
                  <textarea
                    placeholder="Outbound Agent: Hello, is this John?&#10;Prospect: Yes, I am interested in routing modules..."
                    value={transcriptInput}
                    onChange={(e) => setTranscriptInput(e.target.value)}
                    disabled={analyzing}
                    className="w-full h-24 p-2.5 rounded-lg border border-border bg-background text-xs font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
                  />
                  <Button
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5 bg-ai hover:bg-ai/90 text-ai-foreground border border-ai/20"
                    onClick={handleAnalyzeTranscript}
                    disabled={analyzing || !transcriptInput.trim()}
                  >
                    <Sparkles className="w-4 h-4" />
                    {analyzing ? "Parsing Transcript..." : "Analyze Transcript & Create Tasks"}
                  </Button>
                </div>
              </div>

              {/* Timeline activities panel */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Activity Logs
                </h4>
                <ActivityTimeline
                  contactId={selectedContact.id}
                  refreshTrigger={timelineRefresh}
                />
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>

      <ImportWizard
        open={showImportWizard}
        onOpenChange={setShowImportWizard}
        onImportComplete={handleImportComplete}
      />

      {/* AI Draft Dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="sm:max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-ai font-bold">
              <Sparkles className="w-5 h-5 text-ai" />
              AI Follow-up Draft ({draftChannel === "email" ? "Email" : "WhatsApp"})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              className="w-full h-40 p-3 border border-border bg-background rounded-lg text-xs leading-relaxed font-sans focus:outline-none focus:border-primary/50"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span>You can edit the draft content directly before copying.</span>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(draftText);
                  toast.success("Draft copied to clipboard!");
                }}
              >
                Copy Text
              </Button>
              <Button type="button" onClick={handleLogDraftToTimeline} disabled={loggingDraft}>
                {loggingDraft ? "Logging..." : "Log to Activity Timeline"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
