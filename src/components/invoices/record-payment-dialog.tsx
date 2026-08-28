"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { recordInvoicePayment, PaymentMode } from "@/app/actions/payments";
import { toast } from "sonner";
import {
  DollarSign,
  Landmark,
  QrCode,
  CreditCard,
  Banknote,
  FileCheck2,
  Calendar,
  CheckCircle2,
} from "lucide-react";

interface RecordPaymentDialogProps {
  invoice: any | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded?: (result: any) => void;
}

const PAYMENT_MODES: Array<{ id: PaymentMode; label: string; icon: any }> = [
  { id: "upi", label: "UPI / QR", icon: QrCode },
  { id: "bank_transfer", label: "Bank Transfer (NEFT/RTGS/IMPS)", icon: Landmark },
  { id: "credit_card", label: "Credit / Debit Card", icon: CreditCard },
  { id: "cheque", label: "Cheque / DD", icon: FileCheck2 },
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "gateway", label: "Online Gateway / Link", icon: DollarSign },
];

export function RecordPaymentDialog({
  invoice,
  isOpen,
  onClose,
  onPaymentRecorded,
}: RecordPaymentDialogProps) {
  if (!invoice) return null;

  const totalAmount = invoice.amount || 0;
  const currentPaid = invoice.paidAmount || (invoice.status === "paid" ? totalAmount : 0);
  const remainingBalance = Math.max(0, totalAmount - currentPaid);

  const [amount, setAmount] = useState<string>(remainingBalance > 0 ? String(remainingBalance) : String(totalAmount));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive payment amount.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await recordInvoicePayment({
        invoiceId: invoice.id,
        amount: numAmount,
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
      });

      toast.success(
        `Recorded ₹${numAmount.toLocaleString("en-IN")} via ${paymentMode.toUpperCase()}. Status: ${result.updatedInvoice.status.toUpperCase()}`
      );

      if (onPaymentRecorded) {
        onPaymentRecorded(result);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </span>
              Record Payment
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {invoice.invoiceNumber}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Record manual or offline payments (UPI, NEFT, Cheque, Cash) to settle customer balances.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Invoice Summary Card */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-bold text-foreground">{invoice.client?.name || invoice.clientName || "B2B Client"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Total:</span>
              <span className="font-mono font-semibold text-foreground">₹{totalAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Already Paid:</span>
              <span className="font-mono text-emerald-600">₹{currentPaid.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border/40 font-bold">
              <span className="text-foreground">Remaining Balance:</span>
              <span className="font-mono text-primary text-sm">₹{remainingBalance.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="payment-amount" className="text-xs font-semibold">
                Payment Amount (₹)
              </Label>
              <button
                type="button"
                onClick={() => setAmount(String(remainingBalance))}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                Pay Full Balance (₹{remainingBalance.toLocaleString("en-IN")})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-muted-foreground font-bold">₹</span>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 font-mono text-sm font-semibold"
              />
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Payment Mode</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = paymentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id)}
                    className={`p-2 rounded-lg border text-left transition-all flex items-center gap-2 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border/70 hover:bg-muted/30 text-muted-foreground text-xs"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] truncate">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ref-no" className="text-xs font-semibold">
                Transaction ID / UTR / Cheque No.
              </Label>
              <Input
                id="ref-no"
                placeholder="e.g. UTR-9902341908"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paid-date" className="text-xs font-semibold">
                Payment Date
              </Label>
              <Input
                id="paid-date"
                type="date"
                required
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold">
              Internal Notes / Memo (Optional)
            </Label>
            <Input
              id="notes"
              placeholder="e.g. Received via NEFT from client finance desk"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              size="sm"
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submitting ? "Recording..." : `Confirm Payment of ₹${Number(amount || 0).toLocaleString("en-IN")}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
