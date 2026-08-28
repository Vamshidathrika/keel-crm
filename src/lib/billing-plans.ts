export type PlanKey = "starter" | "growth" | "enterprise";

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  badge?: string;
  priceMonthlyINR: number;
  priceAnnualINR: number;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  seatsIncluded: number;
  features: string[];
  limits: {
    maxContacts: number;
    maxDeals: number;
    agentFleetActive: boolean;
    quoteToCashEnabled: boolean;
    customFieldsEnabled: boolean;
    auditLogsEnabled: boolean;
  };
}

export const PRICING_PLANS: Record<PlanKey, PlanDefinition> = {
  starter: {
    key: "starter",
    name: "Starter Fleet",
    priceMonthlyINR: 2999,
    priceAnnualINR: 28790,
    seatsIncluded: 5,
    features: [
      "Up to 5 Team Seats",
      "1,000 Active Contacts & Leads",
      "Kanban Sales Pipelines & Custom Stages",
      "AI Lead Scoring & Activity Timeline",
      "WhatsApp & Telephony CTI Bridge",
      "Community Email Support",
    ],
    limits: {
      maxContacts: 1000,
      maxDeals: 200,
      agentFleetActive: false,
      quoteToCashEnabled: false,
      customFieldsEnabled: false,
      auditLogsEnabled: false,
    },
  },
  growth: {
    key: "growth",
    name: "Growth Ops",
    badge: "Most Popular",
    priceMonthlyINR: 7999,
    priceAnnualINR: 76790,
    seatsIncluded: 15,
    features: [
      "Up to 15 Team Seats",
      "Unlimited Contacts & Pipelines",
      "Predictable Revenue Engine (Seeds/Nets/Spears)",
      "Automated Quote-to-Cash & GST Invoicing",
      "Custom Business Entities & Field Modeler",
      "Autonomous Agent Fleet (5 Autonomous Specialists)",
      "Priority 24/7 Support with SLA",
    ],
    limits: {
      maxContacts: 100000,
      maxDeals: 10000,
      agentFleetActive: true,
      quoteToCashEnabled: true,
      customFieldsEnabled: true,
      auditLogsEnabled: true,
    },
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise Scaler",
    badge: "Enterprise Grade",
    priceMonthlyINR: 19999,
    priceAnnualINR: 191990,
    seatsIncluded: 50,
    features: [
      "50 Team Seats Included (₹499/add'l seat)",
      "Unlimited Custom Objects & Data Models",
      "Dedicated Autonomous Agent Sandbox",
      "Enterprise Sales Cadences & Battlecards",
      "Manager Deal Approval & Discount Overrides",
      "Single Sign-On (SAML/Okta) & RBAC Guard",
      "Dedicated Customer Success Manager",
    ],
    limits: {
      maxContacts: 1000000,
      maxDeals: 100000,
      agentFleetActive: true,
      quoteToCashEnabled: true,
      customFieldsEnabled: true,
      auditLogsEnabled: true,
    },
  },
};
