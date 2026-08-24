import { Client, Quotation, Invoice, Payment, Project, Deliverable } from "@/db/schema";

export type { Client, Quotation, Invoice, Payment, Project, Deliverable };

export interface QuotationWithClient extends Quotation {
  client?: Client | null;
}

export interface InvoiceWithPayments extends Invoice {
  client?: Client | null;
  payments?: Payment[];
}
