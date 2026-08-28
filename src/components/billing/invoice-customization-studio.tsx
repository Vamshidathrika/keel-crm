"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateInvoiceCustomization } from "@/app/actions/invoice-customization";
import { toast } from "sonner";
import {
  Palette,
  Eye,
  FileText,
  Save,
  Check,
  QrCode,
  Landmark,
  Layers,
  Sparkles,
} from "lucide-react";

interface InvoiceCustomizationStudioProps {
  initialCustomization: any;
  gstSettings: any;
}

const THEME_OPTIONS = [
  {
    id: "modern_slate",
    name: "Modern Slate",
    color: "#3b82f6",
    description: "Clean SaaS aesthetic with vibrant primary highlights and structured grids.",
  },
  {
    id: "classic_navy",
    name: "Classic Navy",
    color: "#1e3a8a",
    description: "Traditional corporate blue theme with formal serif typography.",
  },
  {
    id: "minimalist_emerald",
    name: "Minimalist Emerald",
    color: "#059669",
    description: "Modern organic green layout optimized for agencies and services.",
  },
  {
    id: "enterprise_dark",
    name: "Enterprise Dark",
    color: "#0f172a",
    description: "High-contrast luxury layout for high-ticket enterprise contracts.",
  },
];

export function InvoiceCustomizationStudio({
  initialCustomization,
  gstSettings,
}: InvoiceCustomizationStudioProps) {
  const [formData, setFormData] = useState({
    templateTheme: initialCustomization?.templateTheme || "modern_slate",
    primaryColor: initialCustomization?.primaryColor || "#3b82f6",
    showTaxBreakup: initialCustomization?.showTaxBreakup !== false,
    showHsnSac: initialCustomization?.showHsnSac !== false,
    showBankDetails: initialCustomization?.showBankDetails !== false,
    showUpiQr: initialCustomization?.showUpiQr !== false,
    termsAndConditions:
      initialCustomization?.termsAndConditions ||
      "1. Payment is due within standard terms.\n2. Goods/Services once billed are non-refundable.\n3. Subject to local jurisdiction.",
    declarationText:
      initialCustomization?.declarationText ||
      "We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.",
    footerNote: initialCustomization?.footerNote || "Thank you for your valued partnership!",
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateInvoiceCustomization(formData);
      toast.success("Invoice template customization saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update invoice customization.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Customization Controls */}
      <div className="lg:col-span-6 space-y-6">
        {/* Template Theme Selector */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Palette className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Invoice Template Theme</CardTitle>
                <CardDescription className="text-xs">
                  Select a layout style for printed and downloaded PDF tax invoices.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = formData.templateTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        templateTheme: theme.id as any,
                        primaryColor: theme.color,
                      })
                    }
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/70 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: theme.color }}
                        />
                        {theme.name}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {theme.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Section Toggles */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Document Sections & Compliance</CardTitle>
            <CardDescription className="text-xs">
              Toggle visibility of GST compliance elements and bank payment blocks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:bg-muted/40 cursor-pointer">
                <div>
                  <span className="font-medium text-foreground">Detailed GST Tax Split (CGST/SGST/IGST)</span>
                  <p className="text-[11px] text-muted-foreground">Renders line-item and summary GST tax rates.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.showTaxBreakup}
                  onChange={(e) => setFormData({ ...formData, showTaxBreakup: e.target.checked })}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:bg-muted/40 cursor-pointer">
                <div>
                  <span className="font-medium text-foreground">HSN / SAC Code Column</span>
                  <p className="text-[11px] text-muted-foreground">Mandatory for GST compliant B2B tax invoices.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.showHsnSac}
                  onChange={(e) => setFormData({ ...formData, showHsnSac: e.target.checked })}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:bg-muted/40 cursor-pointer">
                <div>
                  <span className="font-medium text-foreground">Bank Account Details Block</span>
                  <p className="text-[11px] text-muted-foreground">Shows Bank, A/C No., IFSC, and Beneficiary name.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.showBankDetails}
                  onChange={(e) => setFormData({ ...formData, showBankDetails: e.target.checked })}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:bg-muted/40 cursor-pointer">
                <div>
                  <span className="font-medium text-foreground">Dynamic UPI Scan & Pay QR Code</span>
                  <p className="text-[11px] text-muted-foreground">Generates instant NPCI UPI intent QR code on the invoice.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.showUpiQr}
                  onChange={(e) => setFormData({ ...formData, showUpiQr: e.target.checked })}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Legal Text, Terms & Declarations */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Terms, Declaration & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Terms and Conditions</Label>
              <textarea
                rows={3}
                value={formData.termsAndConditions}
                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                className="w-full p-2.5 rounded-md border border-input bg-background text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Statutory Declaration</Label>
              <textarea
                rows={2}
                value={formData.declarationText}
                onChange={(e) => setFormData({ ...formData, declarationText: e.target.value })}
                className="w-full p-2.5 rounded-md border border-input bg-background text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Footer Note</Label>
              <Input
                value={formData.footerNote}
                onChange={(e) => setFormData({ ...formData, footerNote: e.target.value })}
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2 text-xs font-semibold">
          <Save className="w-4 h-4" />
          {saving ? "Saving Template..." : "Save Invoice Customization"}
        </Button>
      </div>

      {/* Right Column: Live WYSIWYG Invoice Preview */}
      <div className="lg:col-span-6">
        <div className="sticky top-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-primary" /> Live Invoice Layout Preview
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">
              Theme: {formData.templateTheme}
            </Badge>
          </div>

          <div className="bg-card text-card-foreground border-2 border-border/90 rounded-xl p-6 shadow-md text-xs space-y-5">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground tracking-tight">
                  {gstSettings?.legalName || "Keel Enterprise Ltd"}
                </h3>
                <p className="text-[11px] text-muted-foreground">GSTIN: {gstSettings?.gstin || "36AAECK1234F1Z5"}</p>
                <p className="text-[11px] text-muted-foreground">State: [{gstSettings?.stateCode || "36"}] {gstSettings?.stateName || "Telangana"}</p>
              </div>
              <div className="text-right">
                <span
                  className="inline-block px-2.5 py-1 rounded text-white font-bold text-xs uppercase"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  TAX INVOICE
                </span>
                <p className="font-mono text-[11px] font-bold mt-1 text-foreground">#INV-2026-0042</p>
                <p className="text-[10px] text-muted-foreground">Date: 25-Aug-2026</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-4 text-[11px] bg-muted/30 p-3 rounded-lg border border-border/50">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Billed To (Client)</span>
                <p className="font-bold text-foreground mt-0.5">Reliance Logistics Division</p>
                <p className="text-muted-foreground">GSTIN: 27AABCR1234K1Z2 (Maharashtra)</p>
                <p className="text-muted-foreground">Place of Supply: [27] Maharashtra</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Tax Treatment</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">Inter-State (IGST 18%)</p>
                <p className="text-muted-foreground">Payment Terms: Net 30</p>
              </div>
            </div>

            {/* Item Table */}
            <div className="border border-border/80 rounded-md overflow-hidden text-[11px]">
              <table className="w-full text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="p-2">Item Description</th>
                    {formData.showHsnSac && <th className="p-2 font-mono text-center">HSN/SAC</th>}
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="p-2 font-medium">Enterprise Cloud CRM License</td>
                    {formData.showHsnSac && <td className="p-2 font-mono text-center text-muted-foreground">998313</td>}
                    <td className="p-2 text-right font-mono">1</td>
                    <td className="p-2 text-right font-mono">₹1,00,000</td>
                    <td className="p-2 text-right font-mono font-semibold">₹1,00,000</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tax Calculation Breakdown */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxable Amount:</span>
                  <span className="font-mono font-semibold text-foreground">₹1,00,000</span>
                </div>
                {formData.showTaxBreakup && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IGST (18%):</span>
                    <span className="font-mono text-foreground">₹18,000</span>
                  </div>
                )}
                <div
                  className="flex justify-between font-bold text-sm pt-2 border-t text-foreground"
                  style={{ color: formData.primaryColor }}
                >
                  <span>Total Payable:</span>
                  <span className="font-mono">₹1,18,000</span>
                </div>
              </div>
            </div>

            {/* Bank Details & QR Code */}
            {(formData.showBankDetails || formData.showUpiQr) && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-border/80">
                {formData.showBankDetails && (
                  <div className="text-[10px] space-y-0.5 text-muted-foreground">
                    <span className="font-bold text-foreground text-[11px] flex items-center gap-1">
                      <Landmark className="w-3 h-3 text-primary" /> Bank Details
                    </span>
                    <p>Bank: {gstSettings?.bankName || "HDFC Bank"}</p>
                    <p>A/C: {gstSettings?.accountNumber || "50200012345678"}</p>
                    <p>IFSC: {gstSettings?.ifscCode || "HDFC0001234"}</p>
                  </div>
                )}
                {formData.showUpiQr && (
                  <div className="flex items-center justify-end gap-2 text-right">
                    <div className="text-[10px] text-muted-foreground">
                      <p className="font-bold text-foreground text-[11px]">Instant UPI Pay</p>
                      <p className="font-mono">{gstSettings?.upiId || "keel@okhdfcbank"}</p>
                      <p className="text-[9px] text-emerald-600 font-semibold">Zero Gateway Fees</p>
                    </div>
                    <div className="w-14 h-14 bg-white p-1 rounded border shadow-sm flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-slate-900" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
