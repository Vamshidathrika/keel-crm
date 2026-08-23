import { WIDGET_REGISTRY } from "./registry";

// Default widget keys for each business type
// Core widgets are always included. Vertical widgets are business-type-specific.

const CORE_WIDGETS = WIDGET_REGISTRY
  .filter((w) => w.defaultFor === "all")
  .map((w) => w.key);

function getVerticalWidgets(businessType: string): string[] {
  return WIDGET_REGISTRY
    .filter((w) => Array.isArray(w.defaultFor) && w.defaultFor.includes(businessType))
    .map((w) => w.key);
}

export const BUSINESS_TYPES = [
  {
    key: "logistics",
    label: "Logistics & Freight",
    icon: "🚢",
    description: "Freight forwarders, shipping companies, 3PLs, and cargo brokers.",
    color: "#0ea5e9",
    industryQuestions: [
      { key: "modes", label: "Which transport modes do you handle?", type: "multiselect", options: ["Ocean", "Air", "Road", "Rail", "Courier"] },
      { key: "deal_size", label: "Average shipment deal value?", type: "select", options: ["< ₹1L", "₹1L–₹10L", "₹10L–₹1Cr", "> ₹1Cr"] },
    ],
  },
  {
    key: "saas",
    label: "SaaS / Software",
    icon: "💻",
    description: "Software companies with recurring subscription revenue models.",
    color: "#8b5cf6",
    industryQuestions: [
      { key: "billing", label: "How do you charge customers?", type: "select", options: ["Monthly subscription", "Annual subscription", "Usage-based", "One-time license"] },
      { key: "avg_arr", label: "Average ARR per customer?", type: "select", options: ["< $1K", "$1K–$10K", "$10K–$100K", "> $100K"] },
    ],
  },
  {
    key: "real_estate",
    label: "Real Estate",
    icon: "🏠",
    description: "Property agents, brokers, developers, and property management firms.",
    color: "#f59e0b",
    industryQuestions: [
      { key: "segment", label: "Which property segment?", type: "select", options: ["Residential", "Commercial", "Industrial", "Mixed"] },
      { key: "avg_value", label: "Average property transaction value?", type: "select", options: ["< ₹50L", "₹50L–₹1Cr", "₹1Cr–₹5Cr", "> ₹5Cr"] },
    ],
  },
  {
    key: "healthcare",
    label: "Healthcare",
    icon: "🏥",
    description: "Clinics, hospitals, health-tech companies, and pharma sales teams.",
    color: "#10b981",
    industryQuestions: [
      { key: "type", label: "What type of healthcare business?", type: "select", options: ["Clinic / Hospital", "Pharma Sales", "Medical Devices", "Health-tech SaaS"] },
      { key: "patient_type", label: "Primary relationship type?", type: "select", options: ["B2C Patients", "B2B Providers", "Both"] },
    ],
  },
  {
    key: "manufacturing",
    label: "Manufacturing",
    icon: "🏭",
    description: "Factories, OEMs, distributors, and industrial product companies.",
    color: "#6366f1",
    industryQuestions: [
      { key: "sales_model", label: "How do you sell?", type: "select", options: ["Direct B2B", "Through Distributors", "Both"] },
      { key: "cycle", label: "Typical sales cycle length?", type: "select", options: ["< 1 week", "1–4 weeks", "1–3 months", "> 3 months"] },
    ],
  },
  {
    key: "consulting",
    label: "Consulting / Services",
    icon: "🤝",
    description: "Management consultants, agencies, law firms, and professional services.",
    color: "#ec4899",
    industryQuestions: [
      { key: "billing_model", label: "How do you bill clients?", type: "select", options: ["Hourly", "Project fixed-fee", "Retainer", "Success fee"] },
      { key: "team_size", label: "Team size?", type: "select", options: ["Solo", "2–10", "11–50", "> 50"] },
    ],
  },
  {
    key: "ecommerce",
    label: "E-commerce / Retail",
    icon: "🛒",
    description: "Online stores, marketplaces, D2C brands, and retail chains.",
    color: "#f97316",
    industryQuestions: [
      { key: "channel", label: "Primary sales channel?", type: "select", options: ["Own website", "Amazon/Flipkart", "WhatsApp Commerce", "Physical + Online"] },
      { key: "orders", label: "Monthly order volume?", type: "select", options: ["< 100", "100–1K", "1K–10K", "> 10K"] },
    ],
  },
  {
    key: "finance",
    label: "Financial Services",
    icon: "🏦",
    description: "Wealth managers, insurance agents, NBFCs, and investment advisors.",
    color: "#14b8a6",
    industryQuestions: [
      { key: "product", label: "Primary financial product?", type: "select", options: ["Loans / Credit", "Insurance", "Mutual Funds / Investments", "Banking"] },
      { key: "compliance", label: "Are you subject to SEBI/RBI/IRDAI regulations?", type: "select", options: ["Yes — SEBI", "Yes — IRDAI", "Yes — RBI", "No"] },
    ],
  },
] as const;

export type BusinessTypeKey = typeof BUSINESS_TYPES[number]["key"];

export function getDefaultWidgetsForType(businessType: string): string[] {
  return [...CORE_WIDGETS, ...getVerticalWidgets(businessType)];
}

export function getBusinessType(key: string) {
  return BUSINESS_TYPES.find((b) => b.key === key);
}
