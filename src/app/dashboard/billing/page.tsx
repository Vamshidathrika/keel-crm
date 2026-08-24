import React from "react";
import { getBillingData } from "@/app/actions/billing";
import BillingClient from "./billing-client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billing & Subscriptions — Keel CRM",
  description: "Manage subscription plans, team seats, and invoices.",
};

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const billingData = await getBillingData().catch((err) => {
    console.error("Billing page load error:", err);
    return null;
  });

  return (
    <BillingClient
      initialBillingData={
        billingData || {
          subscription: {
            status: "active",
            plan: "starter",
            seatCount: 5,
          },
          plan: {
            key: "starter",
            name: "Starter Fleet",
            priceMonthlyINR: 2999,
            priceAnnualINR: 28790,
            seatsIncluded: 5,
            features: [],
            limits: {
              maxContacts: 1000,
              maxDeals: 200,
              agentFleetActive: false,
              quoteToCashEnabled: false,
              customFieldsEnabled: false,
              auditLogsEnabled: false,
            },
          },
          activeSeats: 1,
          seatLimit: 5,
          isActive: true,
        }
      }
    />
  );
}
