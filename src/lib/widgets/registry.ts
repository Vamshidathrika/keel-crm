// Widget Registry — the single source of truth for all available feature modules
// Each widget defines: its key, label, icon (emoji), description, and which business types get it by default

export type WidgetCategory = "core" | "vertical";

export interface WidgetDefinition {
  key: string;
  label: string;
  icon: string;
  description: string;
  category: WidgetCategory;
  /** Which business types get this widget auto-activated. "all" means every type. */
  defaultFor: string[] | "all";
  /** If true, this widget gets a nav entry in the sidebar */
  hasNavEntry: boolean;
  navHref?: string;
  navLabel?: string;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ─── Core Widgets (every org) ───────────────────────────────────────────────
  {
    key: "contacts",
    label: "Contacts",
    icon: "👥",
    description: "Manage leads, prospects, and customers with AI-powered scoring.",
    category: "core",
    defaultFor: "all",
    hasNavEntry: true,
    navHref: "/dashboard/contacts",
    navLabel: "Contacts",
  },
  {
    key: "companies",
    label: "Companies",
    icon: "🏢",
    description: "Track company accounts, domains, and associated contacts.",
    category: "core",
    defaultFor: "all",
    hasNavEntry: true,
    navHref: "/dashboard/companies",
    navLabel: "Companies",
  },
  {
    key: "deals",
    label: "Deals Pipeline",
    icon: "💼",
    description: "Kanban pipeline to manage opportunities through custom stages.",
    category: "core",
    defaultFor: "all",
    hasNavEntry: true,
    navHref: "/dashboard/deals",
    navLabel: "Deals",
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: "✅",
    description: "Create and track follow-up tasks tied to contacts and deals.",
    category: "core",
    defaultFor: "all",
    hasNavEntry: true,
    navHref: "/dashboard/tasks",
    navLabel: "Tasks",
  },
  {
    key: "ai_scoring",
    label: "AI Lead Scoring",
    icon: "✨",
    description: "AI-powered scoring of every contact based on behavior and engagement.",
    category: "core",
    defaultFor: "all",
    hasNavEntry: false,
  },
  {
    key: "automations",
    label: "Workflow Automations",
    icon: "⚡",
    description: "No-code trigger-action automations for deal stage changes and events.",
    category: "core",
    defaultFor: "all",
    hasNavEntry: false,
  },
  {
    key: "what_if_forecast",
    label: "Revenue Forecaster",
    icon: "📈",
    description: "Interactive what-if sliders to simulate pipeline probability scenarios.",
    category: "core",
    defaultFor: "all",
    hasNavEntry: false,
  },
  {
    key: "whatsapp_automation",
    label: "WhatsApp Automation",
    icon: "💬",
    description: "Automate client follow-ups, invoices, quotes, and updates via WhatsApp chats.",
    category: "core",
    defaultFor: "all",
    hasNavEntry: true,
    navHref: "/dashboard/whatsapp",
    navLabel: "WhatsApp",
  },

  // ─── Logistics & Freight ─────────────────────────────────────────────────────
  {
    key: "cargo_rate_calc",
    label: "Cargo Rate Calculator",
    icon: "🚢",
    description: "Calculate buy/sell freight rates, margins, and profit % by carrier mode.",
    category: "vertical",
    defaultFor: ["logistics"],
    hasNavEntry: false,
  },
  {
    key: "shipment_tracker",
    label: "Shipment Tracker",
    icon: "📦",
    description: "Track active shipments, ETAs, and carrier status per deal.",
    category: "vertical",
    defaultFor: ["logistics"],
    hasNavEntry: true,
    navHref: "/dashboard/shipments",
    navLabel: "Shipments",
  },
  {
    key: "carrier_db",
    label: "Carrier Directory",
    icon: "🗂️",
    description: "Maintain a searchable directory of carrier contacts and rates.",
    category: "vertical",
    defaultFor: ["logistics"],
    hasNavEntry: false,
  },

  // ─── SaaS / Software ─────────────────────────────────────────────────────────
  {
    key: "mrr_dashboard",
    label: "MRR Dashboard",
    icon: "💰",
    description: "Track Monthly Recurring Revenue, ARR, churn risk, and growth trends.",
    category: "vertical",
    defaultFor: ["saas"],
    hasNavEntry: true,
    navHref: "/dashboard/revenue",
    navLabel: "Revenue",
  },
  {
    key: "trial_tracker",
    label: "Trial Tracker",
    icon: "⏱️",
    description: "Monitor free trial expirations, conversion rates, and at-risk accounts.",
    category: "vertical",
    defaultFor: ["saas"],
    hasNavEntry: false,
  },
  {
    key: "churn_risk",
    label: "Churn Risk Score",
    icon: "🚨",
    description: "AI-powered churn prediction score for each subscription account.",
    category: "vertical",
    defaultFor: ["saas"],
    hasNavEntry: false,
  },

  // ─── Real Estate ─────────────────────────────────────────────────────────────
  {
    key: "property_listings",
    label: "Property Listings",
    icon: "🏠",
    description: "Track property listings, viewing status, and buyer interest.",
    category: "vertical",
    defaultFor: ["real_estate"],
    hasNavEntry: true,
    navHref: "/dashboard/properties",
    navLabel: "Properties",
  },
  {
    key: "commission_calc",
    label: "Commission Calculator",
    icon: "💵",
    description: "Calculate agent commissions based on sale price and split structure.",
    category: "vertical",
    defaultFor: ["real_estate"],
    hasNavEntry: false,
  },
  {
    key: "mortgage_estimator",
    label: "Mortgage Estimator",
    icon: "🏦",
    description: "Quick EMI and loan affordability estimator for buyer conversations.",
    category: "vertical",
    defaultFor: ["real_estate"],
    hasNavEntry: false,
  },

  // ─── Healthcare ──────────────────────────────────────────────────────────────
  {
    key: "appointment_tracker",
    label: "Appointment Tracker",
    icon: "📅",
    description: "Schedule and track patient or client appointments with reminders.",
    category: "vertical",
    defaultFor: ["healthcare"],
    hasNavEntry: true,
    navHref: "/dashboard/appointments",
    navLabel: "Appointments",
  },
  {
    key: "referral_manager",
    label: "Referral Manager",
    icon: "🔗",
    description: "Track patient referrals, referral sources, and conversion rates.",
    category: "vertical",
    defaultFor: ["healthcare"],
    hasNavEntry: false,
  },
  {
    key: "compliance_tags",
    label: "Compliance Tags",
    icon: "🛡️",
    description: "Tag contacts with compliance flags (consent, HIPAA status, etc.).",
    category: "vertical",
    defaultFor: ["healthcare"],
    hasNavEntry: false,
  },

  // ─── Manufacturing ───────────────────────────────────────────────────────────
  {
    key: "cpq_builder",
    label: "Quote Builder (CPQ)",
    icon: "🏭",
    description: "Configure-Price-Quote tool for custom product orders and pricing.",
    category: "vertical",
    defaultFor: ["manufacturing"],
    hasNavEntry: true,
    navHref: "/dashboard/quotes",
    navLabel: "Quotes",
  },
  {
    key: "supplier_manager",
    label: "Supplier Manager",
    icon: "🔧",
    description: "Track supplier contacts, pricing, lead times, and performance.",
    category: "vertical",
    defaultFor: ["manufacturing"],
    hasNavEntry: false,
  },
  {
    key: "lead_time_calc",
    label: "Lead Time Calculator",
    icon: "⏳",
    description: "Estimate production and delivery lead times for deal planning.",
    category: "vertical",
    defaultFor: ["manufacturing"],
    hasNavEntry: false,
  },

  // ─── Consulting / Professional Services ─────────────────────────────────────
  {
    key: "project_tracker",
    label: "Project Tracker",
    icon: "📋",
    description: "Track client projects, milestones, and deliverables alongside deals.",
    category: "vertical",
    defaultFor: ["consulting"],
    hasNavEntry: true,
    navHref: "/dashboard/projects",
    navLabel: "Projects",
  },
  {
    key: "time_billing",
    label: "Time & Billing",
    icon: "⌚",
    description: "Log billable hours per client and generate invoice summaries.",
    category: "vertical",
    defaultFor: ["consulting"],
    hasNavEntry: false,
  },
  {
    key: "proposal_generator",
    label: "Proposal Generator",
    icon: "📄",
    description: "AI-assisted proposal drafts from deal and contact data.",
    category: "vertical",
    defaultFor: ["consulting"],
    hasNavEntry: false,
  },

  // ─── E-commerce / Retail ─────────────────────────────────────────────────────
  {
    key: "order_tracker",
    label: "Order Tracker",
    icon: "🛒",
    description: "View recent orders, returns, and fulfillment status per contact.",
    category: "vertical",
    defaultFor: ["ecommerce"],
    hasNavEntry: true,
    navHref: "/dashboard/orders",
    navLabel: "Orders",
  },
  {
    key: "clv_score",
    label: "Customer LTV Score",
    icon: "⭐",
    description: "Lifetime value scoring to prioritize high-spend customers.",
    category: "vertical",
    defaultFor: ["ecommerce"],
    hasNavEntry: false,
  },

  // ─── Financial Services ──────────────────────────────────────────────────────
  {
    key: "kyc_tracker",
    label: "KYC Tracker",
    icon: "🪪",
    description: "Track Know-Your-Customer status, document uploads, and compliance.",
    category: "vertical",
    defaultFor: ["finance"],
    hasNavEntry: true,
    navHref: "/dashboard/kyc",
    navLabel: "KYC",
  },
  {
    key: "investment_calc",
    label: "Investment Calculator",
    icon: "📊",
    description: "Compute investment returns, ROI projections, and portfolio values.",
    category: "vertical",
    defaultFor: ["finance"],
    hasNavEntry: false,
  },
];

export const WIDGET_MAP: Record<string, WidgetDefinition> = Object.fromEntries(
  WIDGET_REGISTRY.map((w) => [w.key, w])
);

export function getWidgetsByKeys(keys: string[]): WidgetDefinition[] {
  return keys.map((k) => WIDGET_MAP[k]).filter(Boolean);
}
