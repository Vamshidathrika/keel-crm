"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Globe,
  ExternalLink,
  MapPin,
  X,
  Trash2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createCompany, updateCompany, deleteCompany } from "@/app/actions/companies";
import { createActivity } from "@/app/actions/activities";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const ActivityTimeline = dynamic(() => import("@/components/activity-timeline"), { ssr: false });

type Company = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  website: string | null;
  linkedinUrl?: string | null;
  gstin?: string | null;
  employeeCount?: string | null;
  annualRevenue?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  ownerId: string | null;
  tags: string[];
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

interface CompaniesClientProps {
  initialCompanies: Company[];
  currentUser: any;
}

export default function CompaniesClient({
  initialCompanies,
  currentUser,
}: CompaniesClientProps) {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [query, setQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [timelineRefresh, setTimelineRefresh] = useState(0);

  // Note composition states
  const [noteBody, setNoteBody] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  // New Company states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    domain: "",
    industry: "",
    website: "",
    gstin: "",
    employeeCount: "",
    annualRevenue: "",
    linkedinUrl: "",
    city: "",
    state: "",
    country: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Tag creation state in Drawer
  const [newTagInput, setNewTagInput] = useState("");

  // Sync highlight company from URL parameter
  useEffect(() => {
    if (highlightId) {
      const match = companies.find((c) => c.id === highlightId);
      if (match) {
        const timer = setTimeout(() => {
          setSelectedCompany(match);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightId, companies]);

  const filteredCompanies = companies.filter((c) => {
    const q = (query || "").toLowerCase();
    const name = (c.name || "").toLowerCase();
    const domain = (c.domain || "").toLowerCase();
    const industry = (c.industry || "").toLowerCase();
    const tags = Array.isArray(c.tags) ? c.tags.map((t) => (t || "").toLowerCase()) : [];

    return (
      name.includes(q) ||
      domain.includes(q) ||
      industry.includes(q) ||
      tags.some((t) => t.includes(q))
    );
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Company Name is required");
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        name: createForm.name,
        domain: createForm.domain || undefined,
        industry: createForm.industry || undefined,
        website: createForm.website || undefined,
        gstin: createForm.gstin || undefined,
        employeeCount: createForm.employeeCount || undefined,
        annualRevenue: createForm.annualRevenue ? Number(createForm.annualRevenue) : undefined,
        linkedinUrl: createForm.linkedinUrl || undefined,
        city: createForm.city || undefined,
        state: createForm.state || undefined,
        country: createForm.country || undefined,
        tags: [],
        customFields: {},
      };

      const newCompany = await createCompany(payload);
      setCompanies((prev) => [newCompany, ...prev]);
      setShowCreateDialog(false);
      setCreateForm({
        name: "",
        domain: "",
        industry: "",
        website: "",
        gstin: "",
        employeeCount: "",
        annualRevenue: "",
        linkedinUrl: "",
        city: "",
        state: "",
        country: "",
      });
      toast.success("Company created successfully");
      setSelectedCompany(newCompany);
    } catch (err: any) {
      toast.error(err.message || "Failed to create company");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLogNote = async () => {
    if (!selectedCompany || !noteBody.trim()) return;
    setNoteLoading(true);
    try {
      await createActivity({
        type: "note",
        body: noteBody.trim(),
        relatedCompanyId: selectedCompany.id,
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
    if (!selectedCompany || !newTagInput.trim()) return;
    const tag = newTagInput.trim().toLowerCase();

    if (selectedCompany.tags.includes(tag)) {
      setNewTagInput("");
      return;
    }

    const updatedTags = [...selectedCompany.tags, tag];
    try {
      const updated = await updateCompany(selectedCompany.id, { tags: updatedTags });
      setSelectedCompany(updated);
      setCompanies((prev) => prev.map((c) => (c.id === selectedCompany.id ? updated : c)));
      setNewTagInput("");
      toast.success("Tag added");
    } catch (err: any) {
      toast.error(err.message || "Failed to update tags");
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedCompany) return;
    const updatedTags = selectedCompany.tags.filter((t) => t !== tag);

    try {
      const updated = await updateCompany(selectedCompany.id, { tags: updatedTags });
      setSelectedCompany(updated);
      setCompanies((prev) => prev.map((c) => (c.id === selectedCompany.id ? updated : c)));
      toast.success("Tag removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to update tags");
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company? All linked operations will remain but unlinked.")) {
      return;
    }

    try {
      await deleteCompany(id);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      if (selectedCompany?.id === id) {
        setSelectedCompany(null);
      }
      toast.success("Company deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete company");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> Corporate Accounts
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Institutional account directory, corporate hierarchy mapping, statutory GST compliance profiles, and account intelligence.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Provision Corporate Account
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Active Enterprise Accounts", value: companies.length, icon: Building2, color: "text-primary bg-primary/10" },
          { label: "Strategic Tier-1 Accounts", value: companies.filter((c) => c.tags.includes("vip") || c.tags.includes("enterprise")).length, icon: Globe, color: "text-ai bg-ai/10" },
          { label: "Covered Industry Verticals", value: new Set(companies.map((c) => c.industry).filter(Boolean)).size, icon: MapPin, color: "text-info bg-info/10" },
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
          placeholder="Search by name, domain, industry, or tags..."
          className="pl-9 bg-card border-border placeholder:text-muted-foreground/70"
        />
      </div>

      {/* Companies Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Company Name</th>
              <th className="px-4 py-3 font-semibold">Domain</th>
              <th className="px-4 py-3 font-semibold">Industry</th>
              <th className="px-4 py-3 font-semibold">Website</th>
              <th className="px-4 py-3 font-semibold">Tags</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredCompanies.map((co) => (
              <tr
                key={co.id}
                onClick={() => setSelectedCompany(co)}
                className="hover:bg-muted/30 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3 font-medium text-foreground">{co.name}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{co.domain || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{co.industry || "—"}</td>
                <td className="px-4 py-3">
                  {co.website ? (
                    <a
                      href={co.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Link</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {co.tags.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] text-muted-foreground font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDeleteCompany(co.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredCompanies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No companies found. Create a company or refine your search.
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
            <DialogTitle>Add Company</DialogTitle>
            <DialogDescription>
              Create a new company to link with contacts and deals.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompany} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Acme Shipping Ltd"
                disabled={createLoading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                value={createForm.domain}
                onChange={(e) => setCreateForm({ ...createForm, domain: e.target.value })}
                placeholder="acmeshipping.com"
                disabled={createLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={createForm.industry}
                  onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                  placeholder="e.g. Logistics"
                  disabled={createLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  value={createForm.website}
                  onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
                  placeholder="https://acmeshipping.com"
                  disabled={createLoading}
                />
              </div>
            </div>

            {/* Optional Enterprise & Firmographic Details */}
            <details className="group border border-border/80 rounded-lg p-3 bg-muted/20 text-xs">
              <summary className="font-semibold text-foreground cursor-pointer flex items-center justify-between select-none py-0.5">
                <span className="flex items-center gap-1.5 text-primary">
                  🏢 More Company Details &amp; Tax Info (Optional)
                </span>
                <span className="text-[10px] text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="gstin" className="text-[11px]">GSTIN / Tax ID</Label>
                    <Input
                      id="gstin"
                      value={createForm.gstin}
                      onChange={(e) => setCreateForm({ ...createForm, gstin: e.target.value })}
                      placeholder="e.g. 36AAACH7409R1ZZ"
                      className="h-8 text-xs font-mono"
                      disabled={createLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="employeeCount" className="text-[11px]">Employee Count</Label>
                    <select
                      id="employeeCount"
                      value={createForm.employeeCount}
                      onChange={(e) => setCreateForm({ ...createForm, employeeCount: e.target.value })}
                      className="w-full h-8 text-xs rounded-md border border-border bg-card px-2 text-foreground"
                      disabled={createLoading}
                    >
                      <option value="">Select Company Size</option>
                      <option value="1-10">1-10 Employees</option>
                      <option value="11-50">11-50 Employees</option>
                      <option value="51-200">51-200 Employees</option>
                      <option value="201-1000">201-1000 Employees</option>
                      <option value="1000+">1000+ Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="annualRevenue" className="text-[11px]">Annual Revenue (INR)</Label>
                    <Input
                      id="annualRevenue"
                      type="number"
                      value={createForm.annualRevenue}
                      onChange={(e) => setCreateForm({ ...createForm, annualRevenue: e.target.value })}
                      placeholder="e.g. 50000000"
                      className="h-8 text-xs font-mono"
                      disabled={createLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="companyLinkedin" className="text-[11px]">LinkedIn Company Page</Label>
                    <Input
                      id="companyLinkedin"
                      value={createForm.linkedinUrl}
                      onChange={(e) => setCreateForm({ ...createForm, linkedinUrl: e.target.value })}
                      placeholder="linkedin.com/company/acme"
                      className="h-8 text-xs"
                      disabled={createLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="companyCity" className="text-[11px]">City</Label>
                    <Input
                      id="companyCity"
                      value={createForm.city}
                      onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                      placeholder="e.g. Hyderabad"
                      className="h-8 text-xs"
                      disabled={createLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="companyState" className="text-[11px]">State / Region</Label>
                    <Input
                      id="companyState"
                      value={createForm.state}
                      onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                      placeholder="e.g. Telangana"
                      className="h-8 text-xs"
                      disabled={createLoading}
                    />
                  </div>
                </div>
              </div>
            </details>

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
                {createLoading ? "Creating..." : "Create Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Drawer */}
      <Sheet open={!!selectedCompany} onOpenChange={(o) => { if (!o) setSelectedCompany(null); }}>
        {selectedCompany && (
          <SheetContent className="w-full sm:max-w-lg bg-card border-l border-border flex flex-col p-0 z-50">
            <SheetHeader className="p-6 border-b border-border bg-muted/20">
              <SheetTitle className="text-lg font-bold text-foreground">
                {selectedCompany.name}
              </SheetTitle>
              {selectedCompany.domain && (
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  Domain: {selectedCompany.domain}
                </p>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Detailed Info Cards */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Company Info
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px]">Industry</span>
                    <p className="text-foreground">{selectedCompany.industry || "—"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px]">Website</span>
                    <p className="text-foreground">
                      {selectedCompany.website ? (
                        <a
                          href={selectedCompany.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {selectedCompany.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {selectedCompany.tags.map((t) => (
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
                  {selectedCompany.tags.length === 0 && (
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
                    placeholder="Log a note..."
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

              {/* Timeline */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Activity Timeline
                </h4>
                <ActivityTimeline
                  companyId={selectedCompany.id}
                  refreshTrigger={timelineRefresh}
                />
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
