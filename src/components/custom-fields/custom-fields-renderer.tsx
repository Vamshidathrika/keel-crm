"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { CustomFieldDefinition } from "@/db/schema";

interface CustomFieldsRendererProps {
  fields: CustomFieldDefinition[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
}

export function CustomFieldsRenderer({
  fields,
  values,
  onChange,
  disabled = false,
}: CustomFieldsRendererProps) {
  if (!fields || fields.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      {fields.map((f) => {
        const val = values[f.key] ?? "";

        return (
          <div key={f.id} className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              {f.label}
              {f.isRequired && <span className="text-destructive">*</span>}
            </label>

            {f.fieldType === "text" && (
              <Input
                type="text"
                value={val}
                disabled={disabled}
                placeholder={`Enter ${f.label.toLowerCase()}`}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="h-9 text-xs"
              />
            )}

            {f.fieldType === "number" && (
              <Input
                type="number"
                value={val}
                disabled={disabled}
                placeholder="0"
                onChange={(e) => onChange(f.key, e.target.value ? Number(e.target.value) : "")}
                className="h-9 text-xs"
              />
            )}

            {f.fieldType === "date" && (
              <Input
                type="date"
                value={val}
                disabled={disabled}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="h-9 text-xs"
              />
            )}

            {f.fieldType === "select" && (
              <select
                value={val}
                disabled={disabled}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select an option</option>
                {(f.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {f.fieldType === "boolean" && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id={`cf_${f.key}`}
                  checked={!!val}
                  disabled={disabled}
                  onChange={(e) => onChange(f.key, e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor={`cf_${f.key}`} className="text-xs text-muted-foreground cursor-pointer">
                  {f.label} enabled
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
