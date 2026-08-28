"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { INDIAN_STATES, validateGSTIN } from "@/lib/gst-engine";
import { updateGstSettings } from "@/app/actions/gst-settings";
import { toast } from "sonner";
import {
  ShieldCheck,
  Building,
  Landmark,
  QrCode,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Save,
  HelpCircle,
} from "lucide-react";

interface GstSettingsStudioProps {
  initialSettings: any;
}

export function GstSettingsStudio({ initialSettings }: GstSettingsStudioProps) {
  const [formData, setFormData] = useState({
    gstin: initialSettings?.gstin || "",
    legalName: initialSettings?.legalName || "",
    tradeName: initialSettings?.tradeName || "",
    stateCode: initialSettings?.stateCode || "36",
    stateName: initialSettings?.stateName || "Telangana",
    isCompositionScheme: Boolean(initialSettings?.isCompositionScheme),
    isRcmApplicable: Boolean(initialSettings?.isRcmApplicable),
    lutNumber: initialSettings?.lutNumber || "",
    bankName: initialSettings?.bankName || "",
    accountNumber: initialSettings?.accountNumber || "",
    ifscCode: initialSettings?.ifscCode || "",
    accountHolderName: initialSettings?.accountHolderName || "",
    upiId: initialSettings?.upiId || "",
  });

  const [saving, setSaving] = useState(false);
  const [gstValidation, setGstValidation] = useState<{ isValid: boolean; error?: string } | null>(null);

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setFormData((prev) => ({ ...prev, gstin: clean }));

    if (clean.length === 15) {
      const res = validateGSTIN(clean);
      setGstValidation(res);
      if (res.isValid && res.stateCode) {
        const state = INDIAN_STATES.find((s) => s.code === res.stateCode);
        if (state) {
          setFormData((prev) => ({
            ...prev,
            stateCode: state.code,
            stateName: state.name,
          }));
        }
      }
    } else if (clean.length > 0) {
      setGstValidation({ isValid: false, error: "GSTIN must be exactly 15 alphanumeric characters." });
    } else {
      setGstValidation(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (formData.gstin && formData.gstin.length === 15) {
        const val = validateGSTIN(formData.gstin);
        if (!val.isValid) {
          toast.error(val.error || "Please enter a valid GSTIN.");
          setSaving(false);
          return;
        }
      }

      await updateGstSettings(formData);
      toast.success("GST & Tax Compliance settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update GST settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* GSTIN & Business Registration */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">🇮🇳 Indian GST & Tax Compliance</CardTitle>
                <CardDescription className="text-xs">
                  Configure your GSTIN, registered state, and place-of-supply tax split rules.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs bg-emerald-500/5 text-emerald-600 border-emerald-500/20">
              GSTR-1 Ready
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GSTIN Input with Real-time Validation */}
            <div className="space-y-1.5">
              <Label htmlFor="gstin" className="text-xs font-semibold flex items-center justify-between">
                <span>GSTIN (Goods and Services Tax ID)</span>
                {gstValidation?.isValid && (
                  <span className="text-emerald-600 font-normal flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Valid GSTIN
                  </span>
                )}
              </Label>
              <Input
                id="gstin"
                placeholder="e.g. 36AAECK1234F1Z5"
                value={formData.gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                maxLength={15}
                className={`font-mono uppercase text-sm ${
                  gstValidation && !gstValidation.isValid ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
              {gstValidation && !gstValidation.isValid && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {gstValidation.error}
                </p>
              )}
            </div>

            {/* Registered State */}
            <div className="space-y-1.5">
              <Label htmlFor="stateCode" className="text-xs font-semibold">
                Registered State & Place of Supply (POS)
              </Label>
              <select
                id="stateCode"
                value={formData.stateCode}
                onChange={(e) => {
                  const st = INDIAN_STATES.find((s) => s.code === e.target.value);
                  setFormData({
                    ...formData,
                    stateCode: e.target.value,
                    stateName: st?.name || "",
                  });
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    [{s.code}] {s.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                Invoices within [{formData.stateCode}] {formData.stateName} will split into <strong>CGST (9%) + SGST (9%)</strong>. Other states apply <strong>IGST (18%)</strong>.
              </p>
            </div>

            {/* Legal Business Name */}
            <div className="space-y-1.5">
              <Label htmlFor="legalName" className="text-xs font-semibold">
                Legal Business Name (as per PAN/GST)
              </Label>
              <Input
                id="legalName"
                placeholder="e.g. Keel Software Technologies Private Limited"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Trade Name */}
            <div className="space-y-1.5">
              <Label htmlFor="tradeName" className="text-xs font-semibold">
                Trade Name (Brand Name)
              </Label>
              <Input
                id="tradeName"
                placeholder="e.g. Keel CRM"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          {/* Tax Scheme Checkboxes */}
          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border/50">
            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-border/70 hover:bg-muted/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={formData.isCompositionScheme}
                onChange={(e) => setFormData({ ...formData, isCompositionScheme: e.target.checked })}
                className="mt-1 rounded text-primary focus:ring-primary"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground">Composition Scheme Dealer</span>
                <p className="text-[11px] text-muted-foreground">
                  Check if your business is registered under the GST Composition Levy Scheme.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-border/70 hover:bg-muted/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={formData.isRcmApplicable}
                onChange={(e) => setFormData({ ...formData, isRcmApplicable: e.target.checked })}
                className="mt-1 rounded text-primary focus:ring-primary"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground">Reverse Charge (RCM) Applicable</span>
                <p className="text-[11px] text-muted-foreground">
                  Enable if recipient is liable to pay tax under Section 9(3) / 9(4) of CGST Act.
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Bank Account & UPI Details for On-Invoice Payments */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Bank Account & UPI Instant QR Pay</CardTitle>
              <CardDescription className="text-xs">
                These credentials will appear automatically on customer invoices and generate scan-to-pay QR codes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankName" className="text-xs font-semibold">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="e.g. HDFC Bank Ltd"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountHolderName" className="text-xs font-semibold">Account Holder Name</Label>
              <Input
                id="accountHolderName"
                placeholder="e.g. Keel Software Technologies"
                value={formData.accountHolderName}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountNumber" className="text-xs font-semibold">Bank Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="e.g. 50200012345678"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ifscCode" className="text-xs font-semibold">IFSC Code</Label>
              <Input
                id="ifscCode"
                placeholder="e.g. HDFC0001234"
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                maxLength={11}
                className="font-mono uppercase text-sm"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="upiId" className="text-xs font-semibold flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-primary" />
                <span>UPI ID / VPA (for Instant QR Scan & Pay)</span>
              </Label>
              <Input
                id="upiId"
                placeholder="e.g. keelbilling@okhdfcbank"
                value={formData.upiId}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Invoices will dynamically render a high-resolution NPCI QR code linked to this VPA.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gap-2 text-xs font-semibold">
          <Save className="w-4 h-4" />
          {saving ? "Saving Changes..." : "Save GST & Banking Settings"}
        </Button>
      </div>
    </form>
  );
}
