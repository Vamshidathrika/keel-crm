"use client";

import React, { useState } from "react";
import {
  createCustomObjectRecord,
  updateCustomObjectRecord,
  deleteCustomObjectRecord,
} from "@/app/actions/custom-objects";
import { CustomObjectDefinition, CustomObjectRecord, CustomFieldDefinition } from "@/db/schema";
import { toast } from "sonner";
import {
  Boxes,
  Plus,
  Trash2,
  Search,
  ArrowLeft,
  Calendar,
  User,
  DollarSign,
  Building,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { DynamicFieldRenderer } from "@/components/custom-fields/dynamic-field-renderer";

type RecordWithRelations = CustomObjectRecord & {
  linkedContact?: any;
  linkedDeal?: any;
};

interface CustomObjectClientProps {
  definition: CustomObjectDefinition;
  initialRecords: RecordWithRelations[];
  customFields: CustomFieldDefinition[];
  contacts: any[];
  deals: any[];
}

export default function CustomObjectClient({
  definition,
  initialRecords,
  customFields,
  contacts,
  deals,
}: CustomObjectClientProps) {
  const [records, setRecords] = useState<RecordWithRelations[]>(initialRecords);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [linkedContactId, setLinkedContactId] = useState("");
  const [linkedDealId, setLinkedDealId] = useState("");
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setLoading(true);
    try {
      const created = await createCustomObjectRecord({
        objectDefId: definition.id,
        title,
        attributes,
        linkedContactId: linkedContactId || undefined,
        linkedDealId: linkedDealId || undefined,
      });

      setRecords([created as any, ...records]);
      setShowAdd(false);
      setTitle("");
      setAttributes({});
      setLinkedContactId("");
      setLinkedDealId("");
      toast.success(`${definition.singularName} "${created.title}" recorded!`);
    } catch (err: any) {
      toast.error(err.message || `Failed to create ${definition.singularName}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomObjectRecord(id);
      setRecords(records.filter((r) => r.id !== id));
      toast.success(`${definition.singularName} record deleted.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    }
  };

  const filtered = records.filter(
    (r) =>
      (r.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(r.attributes || {}).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Boxes className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">{definition.pluralName}</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {definition.description || `Manage proprietary ${definition.pluralName.toLowerCase()} records.`}
          </p>
        </div>

        <Button onClick={() => setShowAdd(true)} className="text-xs font-semibold gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add {definition.singularName}
        </Button>
      </div>

      {/* Creation Modal / Card */}
      {showAdd && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">New {definition.singularName}</CardTitle>
            <CardDescription className="text-xs">
              Record a new {definition.singularName.toLowerCase()} entry with custom properties and linked relationships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{definition.singularName} Title / Identifier *</Label>
                <Input
                  required
                  placeholder={`e.g. Unit 402 - Skyline Tower or Shipment #9921`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Linked Contact / Customer</Label>
                  <select
                    value={linkedContactId}
                    onChange={(e) => setLinkedContactId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="">None (Unlinked)</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName || ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Linked Deal / Contract</Label>
                  <select
                    value={linkedDealId}
                    onChange={(e) => setLinkedDealId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="">None (Unlinked)</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} (₹{d.value?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Field Renderer for this Object */}
              <DynamicFieldRenderer
                fields={customFields}
                values={attributes}
                onChange={(key, val) => setAttributes({ ...attributes, [key]: val })}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading} className="font-semibold">
                  Save {definition.singularName}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search & Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Active {definition.pluralName}</CardTitle>
              <CardDescription className="text-xs">{records.length} records in database</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder={`Search ${definition.pluralName.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No {definition.pluralName.toLowerCase()} found. Click "Add {definition.singularName}" to create your first record.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 pl-4">Record Identifier</th>
                    <th className="p-3">Linked Relationships</th>
                    <th className="p-3">Dynamic Properties</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 pl-4 font-bold text-foreground">
                        <div>{rec.title}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{rec.id}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {rec.linkedContact ? (
                          <div className="flex items-center gap-1 text-foreground font-medium">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            {rec.linkedContact.firstName} {rec.linkedContact.lastName || ""}
                          </div>
                        ) : rec.linkedDeal ? (
                          <div className="flex items-center gap-1 text-foreground font-medium">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            {rec.linkedDeal.title}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {Object.entries(rec.attributes || {}).map(([k, v]) => (
                            <span key={k} className="px-1.5 py-0.5 rounded text-[10px] bg-muted font-mono text-muted-foreground">
                              {k}: <strong className="text-foreground">{String(v)}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rec.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
