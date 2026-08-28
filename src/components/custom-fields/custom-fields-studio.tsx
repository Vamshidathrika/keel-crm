"use client";

import React, { useState, useEffect } from "react";
import {
  getCustomFieldDefinitions,
  createCustomFieldDefinition,
  deleteCustomFieldDefinition,
  applyIndustryBlueprint,
} from "@/app/actions/custom-fields";
import { CustomFieldDefinition } from "@/db/schema";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Trash2,
  Layers,
  Building2,
  Truck,
  Cloud,
  Palette,
  Stethoscope,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomFieldsStudio() {
  const [selectedEntity, setSelectedEntity] = useState<"deal" | "contact" | "company" | "project">("deal");
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingBlueprint, setApplyingBlueprint] = useState<string | null>(null);

  // New field modal state
  const [showAdd, setShowAdd] = useState(false);
  const [newField, setNewField] = useState<{
    label: string;
    key: string;
    fieldType: "text" | "number" | "currency" | "dropdown" | "select" | "date" | "boolean" | "url";
    optionsText: string;
    isRequired: boolean;
    defaultValue: string;
  }>({
    label: "",
    key: "",
    fieldType: "text",
    optionsText: "",
    isRequired: false,
    defaultValue: "",
  });

  const fetchFields = async () => {
    setLoading(true);
    try {
      const data = await getCustomFieldDefinitions(selectedEntity);
      setFields(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load custom fields");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, [selectedEntity]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newField.label) return;

    const key = newField.key || newField.label.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const options = newField.optionsText
      ? newField.optionsText.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      await createCustomFieldDefinition({
        entityType: selectedEntity,
        key,
        label: newField.label,
        fieldType: newField.fieldType as any,
        options,
        isRequired: newField.isRequired,
        defaultValue: newField.defaultValue,
      });

      toast.success(`Custom field "${newField.label}" created!`);
      setShowAdd(false);
      setNewField({ label: "", key: "", fieldType: "text", optionsText: "", isRequired: false, defaultValue: "" });
      fetchFields();
    } catch (err: any) {
      toast.error(err.message || "Failed to create custom field");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomFieldDefinition(id);
      toast.success("Custom field deleted.");
      setFields(fields.filter((f) => f.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete custom field");
    }
  };

  const handleApplyBlueprint = async (blueprintKey: "real_estate" | "logistics" | "saas" | "agency" | "healthcare") => {
    setApplyingBlueprint(blueprintKey);
    try {
      await applyIndustryBlueprint(blueprintKey);
      toast.success(`1-Click Industry Blueprint for ${blueprintKey.toUpperCase()} applied!`);
      fetchFields();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply industry blueprint");
    } finally {
      setApplyingBlueprint(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1-Click Vertical Industry Presets */}
      <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-transparent to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-bold">1-Click Vertical Industry Blueprints</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Instantly morph Keel CRM for your specific industry with pre-configured custom fields, pipelines, and stages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { key: "real_estate", name: "Real Estate", icon: Building2, desc: "Properties, SqFt, Site Visits" },
              { key: "logistics", name: "Freight & Logistics", icon: Truck, desc: "Shipments, Ports, Containers" },
              { key: "saas", name: "B2B SaaS", icon: Cloud, desc: "ARR, Seat Tiers, Cadences" },
              { key: "agency", name: "Digital Agency", icon: Palette, desc: "Retainers, Deliverables, CPQ" },
              { key: "healthcare", name: "Healthcare & Clinic", icon: Stethoscope, desc: "Patients, UHID, Specialties" },
            ].map((bp) => {
              const Icon = bp.icon;
              const isApplying = applyingBlueprint === bp.key;
              return (
                <button
                  key={bp.key}
                  onClick={() => handleApplyBlueprint(bp.key as any)}
                  disabled={applyingBlueprint !== null}
                  className="flex flex-col items-start p-3.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-xs transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-2">
                    {isApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-bold text-foreground">{bp.name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{bp.desc}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Entity Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-bold">Dynamic Custom Attributes Studio</h3>
          <p className="text-xs text-muted-foreground">
            Configure custom metadata fields for contacts, opportunities, and accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["deal", "contact", "company", "project"] as const).map((ent) => (
            <button
              key={ent}
              onClick={() => setSelectedEntity(ent)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                selectedEntity === ent
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {ent}s
            </button>
          ))}
          <Button size="sm" onClick={() => setShowAdd(true)} className="text-xs font-semibold gap-1.5 ml-2">
            <Plus className="w-4 h-4" /> Add Field
          </Button>
        </div>
      </div>

      {/* Add Field Form */}
      {showAdd && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">New Custom Attribute on {selectedEntity.toUpperCase()}S</CardTitle>
            <CardDescription className="text-xs">
              Define the field label, machine key, and data type validation rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Display Label</Label>
                  <Input
                    required
                    placeholder="e.g. Number of Bedrooms"
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Machine Key (Optional)</Label>
                  <Input
                    placeholder="e.g. bedrooms"
                    value={newField.key}
                    onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Field Type</Label>
                  <select
                    value={newField.fieldType}
                    onChange={(e: any) => setNewField({ ...newField, fieldType: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="text">Single Line Text</option>
                    <option value="number">Numeric (Integer / Decimal)</option>
                    <option value="currency">Currency (₹ INR)</option>
                    <option value="dropdown">Dropdown (Single Select)</option>
                    <option value="date">Date Picker</option>
                    <option value="boolean">Toggle / Checkbox</option>
                    <option value="url">Web URL</option>
                  </select>
                </div>
              </div>

              {(newField.fieldType === "dropdown" || (newField.fieldType as string) === "select") && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Dropdown Options (Comma-separated)</Label>
                  <Input
                    placeholder="e.g. 1 BHK, 2 BHK, 3 BHK, Luxury Villa"
                    value={newField.optionsText}
                    onChange={(e) => setNewField({ ...newField, optionsText: e.target.value })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="req_check"
                    checked={newField.isRequired}
                    onChange={(e) => setNewField({ ...newField, isRequired: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <Label htmlFor="req_check" className="text-xs font-medium cursor-pointer">
                    Mandatory Field (Required before saving)
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="font-semibold">
                    Save Field Definition
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Fields List Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs">Loading custom schema metadata...</span>
            </div>
          ) : fields.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No custom attributes defined on {selectedEntity}s yet. Click "Add Field" or apply an industry blueprint.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 pl-4">Field Label</th>
                    <th className="p-3">Machine Key</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Options / Schema</th>
                    <th className="p-3 text-center">Required</th>
                    <th className="p-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fields.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 pl-4 font-bold text-foreground">{f.label}</td>
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">{f.key}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                          {f.fieldType}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate">
                        {(f.options as string[])?.length > 0 ? (f.options as string[]).join(", ") : "—"}
                      </td>
                      <td className="p-3 text-center">
                        {f.isRequired ? (
                          <span className="text-amber-600 font-semibold text-[10px]">YES</span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Optional</span>
                        )}
                      </td>
                      <td className="p-3 text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(f.id)}
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
