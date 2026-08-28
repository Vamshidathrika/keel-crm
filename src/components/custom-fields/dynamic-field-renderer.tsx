"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomFieldDefinition } from "@/db/schema";

interface DynamicFieldRendererProps {
  fields: CustomFieldDefinition[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, string>;
}

export function DynamicFieldRenderer({
  fields,
  values,
  onChange,
  errors = {},
}: DynamicFieldRendererProps) {
  if (!fields || fields.length === 0) return null;

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Custom Attributes ({fields.length})
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => {
          const value = values[field.key];
          const error = errors[field.key];
          const options = (field.options as string[]) || [];

          return (
            <div key={field.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  {field.label}
                  {field.isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                <span className="text-[9px] font-mono text-muted-foreground uppercase">{field.fieldType}</span>
              </div>

              {/* Input rendering based on fieldType */}
              {field.fieldType === "dropdown" || field.fieldType === "select" ? (
                <select
                  value={value || ""}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select {field.label}...</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.fieldType === "currency" ? (
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-semibold">₹</span>
                  <Input
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => onChange(field.key, e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="0.00"
                    className="pl-6 h-9 text-xs font-mono"
                  />
                </div>
              ) : field.fieldType === "number" ? (
                <Input
                  type="number"
                  value={value ?? ""}
                  onChange={(e) => onChange(field.key, e.target.value === "" ? null : Number(e.target.value))}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  className="h-9 text-xs font-mono"
                />
              ) : field.fieldType === "date" ? (
                <Input
                  type="date"
                  value={value || ""}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              ) : field.fieldType === "boolean" ? (
                <div className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => onChange(field.key, e.target.checked)}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">Enabled / Yes</span>
                </div>
              ) : (
                <Input
                  type="text"
                  value={value || ""}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  className="h-9 text-xs"
                />
              )}

              {error && <p className="text-[10px] text-destructive font-medium">{error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
