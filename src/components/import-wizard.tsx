"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createContact } from "@/app/actions/contacts";
import { Upload, Check, AlertCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (importedContacts: any[]) => void;
}

export default function ImportWizard({
  open,
  onOpenChange,
  onImportComplete,
}: ImportWizardProps) {
  const [step, setStep] = useState<"upload" | "map" | "importing">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "",
    city: "",
  });
  const [loading, setLoading] = useState(false);

  const contactFields = [
    { key: "firstName", label: "First Name (Required)" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email Address" },
    { key: "phone", label: "Phone (E.164)" },
    { key: "title", label: "Job Title" },
    { key: "city", label: "City" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          setCsvRows(results.data);
          setStep("map");

          // Auto-guess mapping based on header similarity
          const guessed: Record<string, string> = {};
          results.meta.fields.forEach((field) => {
            const fLow = field.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (fLow.includes("firstname") || fLow === "name" || fLow === "first") {
              guessed.firstName = field;
            } else if (fLow.includes("lastname") || fLow === "last") {
              guessed.lastName = field;
            } else if (fLow.includes("email") || fLow === "mail") {
              guessed.email = field;
            } else if (fLow.includes("phone") || fLow === "mobile" || fLow === "num") {
              guessed.phone = field;
            } else if (fLow.includes("title") || fLow === "role" || fLow === "job") {
              guessed.title = field;
            } else if (fLow.includes("city") || fLow === "town") {
              guessed.city = field;
            }
          });
          setMappings((prev) => ({ ...prev, ...guessed }));
        } else {
          toast.error("Invalid CSV format: No header row detected.");
        }
      },
      error: () => {
        toast.error("Failed to parse CSV file.");
      },
    });
  };

  const handleImport = async () => {
    if (!mappings.firstName) {
      toast.error("First Name mapping is required");
      return;
    }

    setStep("importing");
    setLoading(true);
    const importedList: any[] = [];
    let successCount = 0;

    try {
      for (const row of csvRows) {
        const payload: any = {
          firstName: row[mappings.firstName]?.trim() || "Unknown",
        };

        if (mappings.lastName && row[mappings.lastName]) {
          payload.lastName = row[mappings.lastName].trim();
        }
        if (mappings.email && row[mappings.email]) {
          payload.email = row[mappings.email].trim();
        }
        if (mappings.phone && row[mappings.phone]) {
          payload.phone = row[mappings.phone].trim();
        }
        if (mappings.title && row[mappings.title]) {
          payload.title = row[mappings.title].trim();
        }
        if (mappings.city && row[mappings.city]) {
          payload.city = row[mappings.city].trim();
        }

        try {
          const res = await createContact(payload);
          importedList.push(res);
          successCount++;
        } catch (err) {
          console.error("Row import failed:", row, err);
        }
      }

      toast.success(`Imported ${successCount} contacts successfully!`);
      onImportComplete(importedList);
      onOpenChange(false);
      resetState();
    } catch (error) {
      toast.error("CSV import process encountered errors");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setMappings({ firstName: "", lastName: "", email: "", phone: "", title: "", city: "" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetState();
      }}
    >
      <DialogContent className="sm:max-w-md border border-border bg-card">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription className="text-xs">
            Import bulk lists of clients. Setup maps to bind headers appropriately.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center border border-dashed border-border p-8 rounded-lg bg-muted/5 space-y-4">
            <Upload className="w-10 h-10 text-muted-foreground/60" />
            <div className="text-center">
              <p className="text-xs font-semibold text-foreground">Click to upload contacts CSV</p>
              <p className="text-[10px] text-muted-foreground mt-1">UTF-8 formatted files with headers</p>
            </div>
            <label className="cursor-pointer">
              <span className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded border border-primary hover:bg-primary/95 transition-all">
                Select File
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto pr-1 space-y-3">
              {contactFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">{field.label}</Label>
                  <Select
                    value={mappings[field.key] || "none"}
                    onValueChange={(val) =>
                      setMappings((prev) => ({ ...prev, [field.key]: val === "none" ? "" : (val || "") }))
                    }
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select CSV Column" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Ignore / None</SelectItem>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter className="pt-2 border-t border-border">
              <Button variant="ghost" onClick={resetState} disabled={loading}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={loading || !mappings.firstName}>
                Import {csvRows.length} Contacts
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
            <FileSpreadsheet className="w-10 h-10 text-primary animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-foreground">Importing Contacts...</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Creating profiles and checking duplicates. Please do not close this window.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
