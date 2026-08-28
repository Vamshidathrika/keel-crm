/**
 * 🇮🇳 Keel Sovereign Indian GST & Statutory Tax Engine
 */

export interface GSTState {
  code: string;
  name: string;
}

export const INDIAN_STATES: GSTState[] = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "97", name: "Other Territory / SEZ" },
];

export interface HsnSacCode {
  code: string;
  description: string;
  defaultGstRate: number; // e.g. 18
  type: "goods" | "services";
}

export const COMMON_HSN_SAC_CODES: HsnSacCode[] = [
  { code: "998313", description: "Information Technology and Software Development Services", defaultGstRate: 18, type: "services" },
  { code: "998311", description: "Management and Business Consulting Services", defaultGstRate: 18, type: "services" },
  { code: "998314", description: "Internet & Digital Marketing Services", defaultGstRate: 18, type: "services" },
  { code: "998713", description: "Freight Transport and Logistics Operations", defaultGstRate: 18, type: "services" },
  { code: "997212", description: "Real Estate Brokerage and Advisory Services", defaultGstRate: 18, type: "services" },
  { code: "999312", description: "Healthcare and Clinical Diagnostic Consultation", defaultGstRate: 0, type: "services" },
  { code: "847130", description: "Laptops, Portable Computers and Hardware", defaultGstRate: 18, type: "goods" },
  { code: "851762", description: "Routers, Modems and Networking Gateways", defaultGstRate: 18, type: "goods" },
];

/**
 * Validate standard 15-character GSTIN format
 */
export function validateGSTIN(gstin: string): { isValid: boolean; stateCode?: string; pan?: string; error?: string } {
  if (!gstin) return { isValid: false, error: "GSTIN cannot be empty" };
  const clean = gstin.trim().toUpperCase();
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!regex.test(clean)) {
    return {
      isValid: false,
      error: "Invalid GSTIN format. Must be 15 chars (e.g. 36AAECK1234F1Z5)",
    };
  }

  const stateCode = clean.substring(0, 2);
  const pan = clean.substring(2, 12);
  const state = INDIAN_STATES.find((s) => s.code === stateCode);

  if (!state) {
    return {
      isValid: false,
      error: `Invalid state code ${stateCode} in GSTIN`,
    };
  }

  return { isValid: true, stateCode, pan };
}

export interface LineItemForGst {
  name: string;
  hsnSac?: string;
  qty: number;
  unitPrice: number;
  taxPercent?: number; // default 18
  discountPercent?: number;
}

export interface GstCalculationResult {
  taxType: "intra_state" | "inter_state" | "export_zero_rated";
  placeOfSupplyStateCode: string;
  placeOfSupplyStateName: string;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
  hsnSummary: Array<{
    hsnSac: string;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  }>;
}

/**
 * Compute multi-item GST split (CGST + SGST vs IGST)
 */
export function calculateGstBreakup(
  items: LineItemForGst[],
  supplierStateCode: string = "36", // Default Telangana
  placeOfSupplyStateCode: string = "36"
): GstCalculationResult {
  const isIntraState = supplierStateCode === placeOfSupplyStateCode;
  const stateObj = INDIAN_STATES.find((s) => s.code === placeOfSupplyStateCode) || {
    code: placeOfSupplyStateCode,
    name: "Unknown State",
  };

  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const hsnMap: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; rate: number }> = {};

  for (const item of items) {
    const rawTotal = item.qty * item.unitPrice;
    const discount = item.discountPercent ? (rawTotal * item.discountPercent) / 100 : 0;
    const itemTaxable = rawTotal - discount;
    const rate = item.taxPercent !== undefined ? item.taxPercent : 18;
    const hsn = item.hsnSac || "998313";

    subtotal += rawTotal;
    totalDiscount += discount;
    taxableAmount += itemTaxable;

    let itemCgst = 0;
    let itemSgst = 0;
    let itemIgst = 0;

    if (isIntraState) {
      itemCgst = Math.round((itemTaxable * (rate / 2)) / 100);
      itemSgst = Math.round((itemTaxable * (rate / 2)) / 100);
      totalCgst += itemCgst;
      totalSgst += itemSgst;
    } else {
      itemIgst = Math.round((itemTaxable * rate) / 100);
      totalIgst += itemIgst;
    }

    if (!hsnMap[hsn]) {
      hsnMap[hsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, rate };
    }
    hsnMap[hsn].taxable += itemTaxable;
    hsnMap[hsn].cgst += itemCgst;
    hsnMap[hsn].sgst += itemSgst;
    hsnMap[hsn].igst += itemIgst;
  }

  const totalTax = isIntraState ? totalCgst + totalSgst : totalIgst;
  const grandTotal = taxableAmount + totalTax;

  const hsnSummary = Object.entries(hsnMap).map(([hsnSac, val]) => ({
    hsnSac,
    taxableAmount: val.taxable,
    cgst: val.cgst,
    sgst: val.sgst,
    igst: val.igst,
    totalTax: val.cgst + val.sgst + val.igst,
  }));

  return {
    taxType: isIntraState ? "intra_state" : "inter_state",
    placeOfSupplyStateCode,
    placeOfSupplyStateName: stateObj.name,
    subtotal,
    totalDiscount,
    taxableAmount,
    cgstRate: isIntraState ? 9 : 0,
    cgstAmount: totalCgst,
    sgstRate: isIntraState ? 9 : 0,
    sgstAmount: totalSgst,
    igstRate: !isIntraState ? 18 : 0,
    igstAmount: totalIgst,
    totalTax,
    grandTotal,
    hsnSummary,
  };
}

/**
 * Generate UPI QR Payment String (NPCI Specification)
 */
export function generateUpiPaymentString(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  invoiceNumber: string;
}): string {
  const { upiId, payeeName, amount, invoiceNumber } = params;
  const encodedName = encodeURIComponent(payeeName.trim());
  const encodedNote = encodeURIComponent(`Payment for Invoice ${invoiceNumber}`);
  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount.toFixed(2)}&cu=INR&tn=${encodedNote}`;
}
