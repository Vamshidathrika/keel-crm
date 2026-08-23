"use client";

import React from "react";
import { Printer, ArrowLeft, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

function adjustColor(hexColor: string, percent: number): string {
  try {
    const hex = hexColor.replace("#", "");
    const num = parseInt(hex, 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    
    const clamp = (val: number) => Math.min(255, Math.max(0, val));
    
    return "#" + (
      0x1000000 +
      clamp(R) * 0x10000 +
      clamp(G) * 0x100 +
      clamp(B)
    ).toString(16).slice(1);
  } catch {
    return hexColor;
  }
}

interface InvoicePrintClientProps {
  invoice: any;
  branding: any;
  orgName: string;
  items: any[];
}

export default function InvoicePrintClient({
  invoice,
  branding,
  orgName,
  items,
}: InvoicePrintClientProps) {
  const selectedTemplate = branding.invoiceTemplate || "gradient";

  const primaryColor = branding.primaryColor || "#6366F1";
  const appName = branding.appName || orgName;

  const handlePrint = () => {
    window.print();
  };

  // Subtotal calculations
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const gstAmount = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + gstAmount;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 md:px-8 print:bg-white print:py-0 print:px-0 font-sans text-slate-800">
      
      {/* Floating Action Bar - Hidden during print */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center bg-card p-4 rounded-xl border border-border print:hidden shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="text-xs flex items-center gap-1 border border-border"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>

        <div className="flex items-center gap-4">
          <Button
            onClick={handlePrint}
            className="text-xs flex items-center gap-1.5 text-white border-none hover:opacity-90 font-bold"
            style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -15)} 100%)` }}
          >
            <Printer className="w-4 h-4" /> Print Invoice
          </Button>
        </div>
      </div>

      {/* CSS Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #invoice-print-sheet, #invoice-print-sheet * {
            visibility: visible !important;
          }
          #invoice-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            background: #fff !important;
            height: auto !important;
            overflow: visible !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      ` }} />

      {/* Invoice Sheet container */}
      <div
        id="invoice-print-sheet"
        className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl print:border-none print:rounded-none overflow-hidden shadow-sm flex flex-col justify-between min-h-[297mm] print:min-h-screen"
      >
        
        {/* DESIGN 1: GRADIENT SEMPURNA */}
        {selectedTemplate === "gradient" && (
          <>
            <div>
              {/* Gradient Banner Header */}
              <div
                className="text-white p-8 md:p-10 pb-16 flex flex-col md:flex-row justify-between items-start gap-8"
                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -25)} 100%)` }}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {branding.logoUrl ? (
                      <img src={branding.logoUrl} alt={appName} className="h-10 max-w-[150px] object-contain bg-white/20 p-1.5 rounded" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-lg text-white">
                        {appName[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-lg font-bold tracking-wider uppercase">{appName}</span>
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight">INVOICE</h1>
                    <p className="text-sm font-semibold opacity-90"># {invoice.invoiceNumber.slice(-7).toUpperCase()}</p>
                  </div>
                  <p className="text-xs opacity-75 pt-2">{appName}, {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>

                <div className="space-y-3.5 text-xs text-right md:self-end">
                  <div>
                    <p className="opacity-75 uppercase tracking-wider text-[9px] font-mono">Date Information</p>
                    <p className="font-semibold text-sm mt-0.5">
                      {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <p className="opacity-75 uppercase tracking-wider text-[9px] font-mono">Invoice Number</p>
                    <p className="font-semibold text-sm mt-0.5">{invoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="opacity-75 uppercase tracking-wider text-[9px] font-mono">INVOICE TO:</p>
                    <p className="font-bold text-sm mt-0.5">{invoice.client?.name}</p>
                    {invoice.client?.company && (
                      <p className="opacity-90">{invoice.client.company.name}</p>
                    )}
                  </div>
                  <div className="pt-1">
                    <p className="font-bold text-sm">Total Due: ₹{grandTotal.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>

              {/* Floating Items table */}
              <div className="px-8 md:px-10 -mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden">
                  <div className="bg-slate-100/90 border-b border-slate-200/60 px-6 py-4 grid grid-cols-12 font-bold font-mono text-[10px] tracking-wider text-slate-500 uppercase">
                    <span className="col-span-1">NO.</span>
                    <span className="col-span-6">Item Description</span>
                    <span className="col-span-2 text-right">Price</span>
                    <span className="col-span-1 text-center">Qty.</span>
                    <span className="col-span-2 text-right">Total</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {items.map((it: any, idx: number) => {
                      const isEven = idx % 2 === 1;
                      return (
                        <div
                          key={idx}
                          className={`px-6 py-5 grid grid-cols-12 items-center text-xs text-slate-700 avoid-break ${
                            isEven ? "bg-slate-50/50" : ""
                          }`}
                        >
                          <span className="col-span-1 font-mono text-slate-400">
                            {String(idx + 1).padStart(2, "0")}.
                          </span>
                          <div className="col-span-6 space-y-0.5 pr-4">
                            <p className="font-bold text-slate-900">{it.name}</p>
                            <p className="text-[10px] text-slate-400">Services rendered matching commercial proposal.</p>
                          </div>
                          <span className="col-span-2 text-right font-mono">
                            ₹{it.price.toLocaleString("en-IN")}
                          </span>
                          <span className="col-span-1 text-center font-mono">{it.qty}</span>
                          <span className="col-span-2 text-right font-mono font-bold text-slate-900">
                            ₹{(it.qty * it.price).toLocaleString("en-IN")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer info block */}
            <div className="p-8 md:p-10 pt-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-end avoid-break">
              <div className="md:col-span-7 space-y-6 text-xs text-slate-500">
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">Thank you for your business</h4>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> +91 99000 77000
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> support@{appName.toLowerCase().replace(/\s+/g, "")}.com
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-[10px] uppercase tracking-wider font-mono">
                    PAYMENT METHOD
                  </p>
                  <div className="grid grid-cols-3 gap-0.5 text-[11px] font-mono leading-normal">
                    <span>Bank Account:</span>
                    <span className="col-span-2 text-slate-700 font-semibold">50200088992211 (Current)</span>
                    <span>Bank Name:</span>
                    <span className="col-span-2 text-slate-700 font-semibold">HDFC Corporate Bank</span>
                    <span>Bank Code:</span>
                    <span className="col-span-2 text-slate-700 font-semibold">HDFC0000104 (IFSC)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-[10px] uppercase tracking-wider font-mono">
                    TERMS & CONDITIONS
                  </p>
                  <p className="text-[10px] leading-relaxed italic pr-4">
                    Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis.
                  </p>
                </div>
              </div>

              <div className="md:col-span-5 space-y-6 text-right ml-auto w-full max-w-[320px]">
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Sub total</span>
                    <span className="font-semibold text-slate-800">: ₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Tax</span>
                    <span className="font-semibold text-slate-800">: ₹{gstAmount.toLocaleString("en-IN")}</span>
                  </div>

                  <div
                    className="text-white rounded-full py-2 px-5 flex justify-between items-center font-sans font-bold shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -25)} 100%)` }}
                  >
                    <span>Total</span>
                    <span>: ₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <p className="text-[15px] font-semibold text-slate-800 font-serif italic pr-6 select-none opacity-85 tracking-widest leading-none">
                    Steven Joe
                  </p>
                  <div className="inline-block text-right border-t border-slate-200 pt-1.5 w-48 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    <p className="font-bold text-slate-800">Steven Joe</p>
                    <p className="mt-0.5">Accounting Manager</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* DESIGN 2: MODERN YELLOW ACCENT */}
        {selectedTemplate === "yellow" && (
          <>
            <div className="p-8 md:p-10 pb-0">
              {/* Header logo row */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {branding.logoUrl ? (
                      <img src={branding.logoUrl} alt={appName} className="h-10 max-w-[150px] object-contain animate-fade-in" />
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: primaryColor }}>
                          {appName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-extrabold uppercase text-slate-800 tracking-wider leading-none">{appName}</p>
                          <p className="text-[9px] text-slate-400 tracking-widest mt-0.5 font-semibold">PARTNER NETWORK</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Horizontal Yellow Accent Banner */}
              <div className="grid grid-cols-12 items-center gap-1 my-8">
                <div className="col-span-5 h-8 rounded-l-sm" style={{ backgroundColor: primaryColor }} />
                <div className="col-span-2 text-center">
                  <h1 className="text-xl font-black text-slate-800 uppercase tracking-widest leading-none">INVOICE</h1>
                </div>
                <div className="col-span-5 h-8 rounded-r-sm" style={{ backgroundColor: primaryColor }} />
              </div>

              {/* Bill to & Invoice Meta Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs pb-4">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-900 text-sm">Invoice to:</h3>
                  <p className="font-extrabold text-slate-800 text-sm">{invoice.client?.name}</p>
                  <p className="text-slate-500 leading-relaxed max-w-xs">
                    {invoice.client?.company?.name || "Client Partner Workspace"},<br />
                    {invoice.client?.email},<br />
                    Phone: {invoice.client?.phone || "—"}
                  </p>
                </div>

                <div className="md:text-right space-y-2 md:ml-auto max-w-[240px]">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                    <span className="font-bold text-slate-900 text-left md:text-right">Invoice#</span>
                    <span className="font-mono text-slate-800 font-semibold">{invoice.invoiceNumber.slice(-7).toUpperCase()}</span>
                    <span className="font-bold text-slate-900 text-left md:text-right">Date</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Table items layout */}
              <div className="border border-slate-200 rounded-lg overflow-hidden mt-6 shadow-sm/5">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold font-mono text-[9px] tracking-wider uppercase border-b border-slate-800">
                      <th className="p-3 text-center w-12">SL.</th>
                      <th className="p-3 pl-4">Item Description</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-center w-16">Qty.</th>
                      <th className="p-3 text-right pr-4">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 text-slate-700 font-medium font-sans">
                        <td className="p-4 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-4 pl-4 space-y-0.5">
                          <p className="font-extrabold text-slate-800">{it.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">Services rendered matching commercial proposal.</p>
                        </td>
                        <td className="p-4 text-right font-mono">₹{it.price.toLocaleString("en-IN")}</td>
                        <td className="p-4 text-center font-mono">{it.qty}</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-800 pr-4">₹{(it.qty * it.price).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer blocks layout */}
            <div className="p-8 md:p-10 pt-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-end avoid-break">
              <div className="md:col-span-7 space-y-4 text-xs text-slate-500">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800">Thank you for your business</h4>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-[9px] uppercase tracking-wider font-mono">
                    Terms & Conditions
                  </p>
                  <p className="text-[9px] leading-relaxed italic pr-4">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce dignissim pretium consectetur.
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-[9px] uppercase tracking-wider font-mono">
                    Payment Info:
                  </p>
                  <div className="grid grid-cols-3 gap-0.5 text-[10px] font-mono leading-normal">
                    <span>Account #:</span>
                    <span className="col-span-2 text-slate-700 font-semibold">1234 5678 9012</span>
                    <span>A/C Name:</span>
                    <span className="col-span-2 text-slate-700 font-semibold">Lorem Ipsum</span>
                    <span>Bank Details:</span>
                    <span className="col-span-2 text-slate-700 font-semibold">Add your bank details</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 space-y-6 text-right ml-auto w-full max-w-[280px]">
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Sub Total:</span>
                    <span className="font-semibold text-slate-800">₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Tax:</span>
                    <span className="font-semibold text-slate-800">₹{gstAmount.toLocaleString("en-IN")}</span>
                  </div>

                  {/* Dynamic brand color strip */}
                  <div className="text-white py-1.5 px-4 flex justify-between font-sans font-black text-sm rounded shadow-sm/5" style={{ backgroundColor: primaryColor }}>
                    <span>Total:</span>
                    <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-4 text-center">
                  <p className="text-[13px] font-semibold text-slate-800 font-serif italic select-none opacity-85 tracking-widest leading-none">
                    Steven Joe
                  </p>
                  <div className="border-t border-slate-200 pt-1 w-44 mx-auto font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    <p className="font-bold text-slate-800">Authorised Sign</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full avoid-break">
              <div className="h-1 w-full" style={{ backgroundColor: primaryColor }} />
              <div className="py-3 text-center font-mono text-[9px] text-slate-400 bg-slate-50 border-t border-slate-200/40">
                Phone # | Address | Website
              </div>
            </div>
          </>
        )}

        {/* DESIGN 3: ARTISAN CURVE */}
        {selectedTemplate === "orange" && (
          <div className="relative">
            {/* Top-Left Accent Curve */}
            <div className="absolute top-0 left-0 rounded-br-[120px] w-64 h-24 print:h-20 print:w-56" style={{ backgroundColor: primaryColor }} />

            {/* Top Header section */}
            <div className="pt-28 px-8 md:px-10 pb-4 flex justify-between items-start">
              {/* Logo / Company name */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt={appName} className="h-10 max-w-[150px] object-contain" />
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: primaryColor }}>
                        {appName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold uppercase text-slate-800 tracking-wider leading-none">{appName}</p>
                        <p className="text-[9px] text-slate-400 tracking-widest mt-0.5 font-semibold">ARTISAN INNOVATION</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Document Type Header */}
              <div className="text-right">
                <h1 className="text-4xl font-extrabold uppercase tracking-widest leading-none" style={{ color: primaryColor }}>INVOICE</h1>
              </div>
            </div>

            {/* Recipient Row */}
            <div className="px-8 md:px-10 py-4 flex justify-end">
              <div className="text-right space-y-1.5">
                <div className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[9px] px-3 py-1 rounded-sm inline-block">
                  INVOICE TO
                </div>
                <p className="font-extrabold text-slate-800 text-sm mt-0.5">{invoice.client?.name}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
                  {invoice.client?.company?.name || "Client Partner Workspace"},<br />
                  {invoice.client?.email},<br />
                  Phone: {invoice.client?.phone || "—"}
                </p>
              </div>
            </div>

            {/* Invoice details strip & Total Due Block */}
            <div className="px-8 md:px-10 py-4 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Details table */}
              <div className="md:col-span-7 space-y-2">
                <div className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[9px] px-3 py-1 rounded-sm">
                  INVOICE DETAILS
                </div>
                <div className="grid grid-cols-3 gap-y-1 text-[11px] font-mono text-slate-600 leading-normal">
                  <span className="font-bold text-slate-700">INVOICE NO:</span>
                  <span className="col-span-2 text-slate-800 font-semibold"># {invoice.invoiceNumber.slice(-7).toUpperCase()}</span>
                  <span className="font-bold text-slate-700">INVOICE DATE:</span>
                  <span className="col-span-2 text-slate-800 font-semibold">
                    {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  <span className="font-bold text-slate-700">ACCOUNT NO:</span>
                  <span className="col-span-2 text-slate-800 font-semibold">3400715</span>
                </div>
              </div>

              {/* Total due block */}
              <div className="md:col-span-5 bg-slate-700 text-white px-5 py-4 rounded-sm flex justify-between items-center text-sm font-bold font-mono shadow-sm">
                <span className="text-xs uppercase tracking-wider text-slate-300">Total Due :</span>
                <span>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Table list */}
            <div className="px-8 md:px-10 py-6">
              <div className="border border-slate-200 rounded-sm overflow-hidden shadow-sm/5">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr
                      className="text-white font-bold font-mono text-[9px] tracking-wider uppercase"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <th className="p-3 text-center w-16">S NO.</th>
                      <th className="p-3 pl-4">ITEM DESCRIPTION</th>
                      <th className="p-3 text-center w-16">QTY</th>
                      <th className="p-3 text-right">UNITE PRICE</th>
                      <th className="p-3 text-right pr-4">PRICE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 text-slate-700 font-medium font-sans">
                        <td className="p-4 text-center font-mono text-slate-400">{String(idx + 1).padStart(2, "0")}</td>
                        <td className="p-4 pl-4 space-y-0.5">
                          <p className="font-extrabold text-slate-800">{it.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">Services rendered matching commercial proposal.</p>
                        </td>
                        <td className="p-4 text-center font-mono">{it.qty}</td>
                        <td className="p-4 text-right font-mono">₹{it.price.toLocaleString("en-IN")}</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-800 pr-4">₹{(it.qty * it.price).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer column elements */}
            <div className="p-8 md:p-10 pt-4 grid grid-cols-1 md:grid-cols-12 gap-8 items-end avoid-break">
              {/* Left col */}
              <div className="md:col-span-7 space-y-4 text-xs text-slate-500">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-[9px] uppercase tracking-wider font-mono">
                    Bank Information
                  </p>
                  <div className="grid grid-cols-3 gap-0.5 text-[10px] font-mono leading-normal">
                    <span>Bank Name:</span>
                    <span className="col-span-2 text-slate-700 font-semibold">HDFC Corporate Bank</span>
                    <span>Swift Code:</span>
                    <span className="col-span-2 text-slate-700 font-semibold">RNK00714 (IFSC)</span>
                    <span>Account No:</span>
                    <span className="col-span-2 text-slate-700 font-semibold">50200088992211</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-[9px] uppercase tracking-wider font-mono">
                    Payment Method
                  </p>
                  <p className="text-[9px] text-slate-600 font-mono">Paypal, VISA, MasterCard, Wire Transfer</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-[9px] uppercase tracking-wider font-mono">
                    Terms and Conditions
                  </p>
                  <p className="text-[9px] leading-relaxed italic pr-4">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut mi. Libero enim leo, egestas id, condimentum at, laoreet.
                  </p>
                </div>
              </div>

              {/* Right col */}
              <div className="md:col-span-5 space-y-6 text-right ml-auto w-full max-w-[280px]">
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">SUB TOTAL</span>
                    <span className="font-semibold text-slate-800">₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Tax: VAT 18%</span>
                    <span className="font-semibold text-slate-800">₹{gstAmount.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="bg-slate-700 text-white py-1.5 px-4 flex justify-between font-sans font-bold text-sm rounded shadow-sm">
                    <span>GRAND TOTAL</span>
                    <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Signature block */}
                <div className="space-y-1 pt-4 text-center">
                  <p className="text-[13px] font-semibold text-slate-800 font-serif italic select-none opacity-85 tracking-widest leading-none">
                    Jonathan Smith
                  </p>
                  <div className="border-t border-slate-200 pt-1.5 w-44 mx-auto font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    <p className="font-bold text-slate-800">Jonathan Smith</p>
                    <p className="mt-0.5">Account Manager</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Dark Footer bar */}
            <div className="w-full avoid-break">
              <div className="bg-slate-800 text-white px-8 py-4 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono gap-4">
                <span>Thank you for your Business.</span>
                <div className="flex items-center gap-6">
                  <span>+91 99000 77000</span>
                  <span>support@artisan.com</span>
                  <span>Singapore, 2002</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
