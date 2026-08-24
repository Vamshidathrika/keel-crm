import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/db";
import { quotations, invoices, payments, clients } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const createQuotationTool = tool(
  async ({ orgId, clientId, dealId, title, items, total }) => {
    const calculatedTotal = total || items.reduce((sum, item) => sum + item.qty * item.price, 0);

    const [qte] = await db
      .insert(quotations)
      .values({
        orgId,
        clientId,
        dealId: dealId || null,
        title,
        items,
        total: calculatedTotal,
        status: "draft",
      })
      .returning();

    return {
      status: "success",
      summary: `Generated quotation "${title}" (#${qte.id}) for ₹${calculatedTotal.toLocaleString()}`,
      quotationId: qte.id,
      total: calculatedTotal,
    };
  },
  {
    name: "crm_create_quotation",
    description: "Generate a CPQ quotation with line items and pricing for a client.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      clientId: z.string().describe("Client ID"),
      dealId: z.string().optional().describe("Associated deal ID"),
      title: z.string().describe("Quotation title / description"),
      items: z.array(
        z.object({
          name: z.string().describe("Item or service name"),
          qty: z.number().describe("Quantity"),
          price: z.number().describe("Unit price"),
        })
      ).describe("List of line items"),
      total: z.number().optional().describe("Optional total override"),
    }),
  }
);

export const createInvoiceTool = tool(
  async ({ orgId, clientId, dealId, amount, dueDate }) => {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const [inv] = await db
      .insert(invoices)
      .values({
        orgId,
        clientId,
        dealId: dealId || null,
        invoiceNumber,
        amount,
        dueDate,
        status: "unpaid",
      })
      .returning();

    return {
      status: "success",
      summary: `Generated invoice ${invoiceNumber} (#${inv.id}) for ₹${amount.toLocaleString()} due on ${dueDate}`,
      invoiceId: inv.id,
      invoiceNumber,
    };
  },
  {
    name: "crm_create_invoice",
    description: "Generate a billable invoice for a client.",
    schema: z.object({
      orgId: z.string().describe("The organization ID"),
      clientId: z.string().describe("Client ID"),
      dealId: z.string().optional().describe("Associated deal ID"),
      amount: z.number().describe("Invoice amount"),
      dueDate: z.string().describe("Payment due date (YYYY-MM-DD)"),
    }),
  }
);
