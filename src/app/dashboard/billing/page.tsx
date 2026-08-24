import React from "react";
import { getBillingData } from "@/app/actions/billing";
import BillingClient from "./billing-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billing & Subscriptions — Keel CRM",
  description: "Manage subscription plans, team seats, and invoices.",
};

export default async function BillingPage() {
  const billingData = await getBillingData();

  return <BillingClient initialBillingData={billingData} />;
}
