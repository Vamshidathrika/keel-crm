import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInvoices } from "@/app/actions/business-os";
import InvoicesClient from "./invoices-client";

export const metadata = {
  title: "Invoices & Billings | Keel CRM",
  description: "Manage client invoices, due dates, payments, and client portal billing statements.",
};

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initialInvoices = await getInvoices();
  return <InvoicesClient user={session.user} initialInvoices={initialInvoices} />;
}
