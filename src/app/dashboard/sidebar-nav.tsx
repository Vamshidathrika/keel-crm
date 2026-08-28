"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Building2,
  CheckSquare,
  Settings,
  Ship,
  TrendingUp,
  Home,
  Calendar,
  Briefcase,
  ShoppingCart,
  CreditCard,
  FileText,
  Package,
  MessageCircle,
  Bot,
  Sparkles,
  Target,
  ListOrdered,
} from "lucide-react";
import { WIDGET_REGISTRY } from "@/lib/widgets/registry";

import { Boxes } from "lucide-react";

// Icon map for vertical widget nav entries
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "/dashboard/shipments": Ship,
  "/dashboard/revenue": TrendingUp,
  "/dashboard/properties": Home,
  "/dashboard/appointments": Calendar,
  "/dashboard/invoices": FileText,
  "/dashboard/quotes": FileText,
  "/dashboard/projects": Briefcase,
  "/dashboard/orders": ShoppingCart,
  "/dashboard/kyc": CreditCard,
  "/dashboard/contacts": Users,
  "/dashboard/companies": Building2,
  "/dashboard/deals": DollarSign,
  "/dashboard/tasks": CheckSquare,
  "/dashboard/whatsapp": MessageCircle,
};

interface SidebarNavProps {
  role: string;
  enabledWidgetKeys?: string[];
  customObjects?: Array<{ id: string; pluralName: string; slug: string }>;
}

export default function SidebarNav({
  role,
  enabledWidgetKeys = [],
  customObjects = [],
}: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  // 1. Core CRM & Pipeline
  const coreCrmLinks = [
    { href: "/dashboard", label: "Executive Overview", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/deals", label: "Deals & Pipeline", icon: DollarSign },
    { href: "/dashboard/contacts", label: "Key Stakeholders", icon: Users },
    { href: "/dashboard/companies", label: "Corporate Accounts", icon: Building2 },
    { href: "/dashboard/products", label: "Commercial Catalog", icon: Package },
    { href: "/dashboard/tasks", label: "Execution Tasks", icon: CheckSquare },
    { href: "/dashboard/team", label: "Sales Force & Workload", icon: Users },
  ];

  // 2. Sales Acceleration & Governance
  const salesExecutionLinks = [
    { href: "/dashboard/quotas", label: "Quotas & Commission", icon: Target },
    { href: "/dashboard/cadences", label: "Sales Cadences", icon: ListOrdered },
    { href: "/dashboard/invoices", label: "Invoices & LedgerOS™", icon: FileText },
    { href: "/dashboard/quotes", label: "Proposals & Contracts", icon: FileText },
  ];

  // 3. Growth & AI RevOps
  const growthAiLinks = [
    { href: "/dashboard/growth", label: "Growth & Flywheel", icon: TrendingUp },
    { href: "/dashboard/agent-hub", label: "Autonomous Agent Hub", icon: Bot },
    { href: "/dashboard/business-os?tab=projects", label: "Client Portals & Projects", icon: Briefcase, tab: "projects" },
    { href: "/dashboard/business-os?tab=insights", label: "AI Executive Insights", icon: Sparkles, tab: "insights" },
  ];

  // 4. Industry Vertical Modules
  const verticalLinks = React.useMemo(() => {
    return WIDGET_REGISTRY.filter(
      (w) =>
        w.hasNavEntry &&
        w.navHref &&
        w.navHref !== "/dashboard" &&
        !w.navHref.startsWith("/dashboard/deals") &&
        !w.navHref.startsWith("/dashboard/business-os") &&
        !w.navHref.startsWith("/dashboard/contacts") &&
        !w.navHref.startsWith("/dashboard/companies") &&
        !w.navHref.startsWith("/dashboard/tasks") &&
        !w.navHref.startsWith("/dashboard/team") &&
        enabledWidgetKeys.includes(w.key)
    ).map((w) => ({
      href: w.navHref!,
      label: w.navLabel ?? w.label,
      icon: ICON_MAP[w.navHref!] ?? Package,
    }));
  }, [enabledWidgetKeys]);

  const renderNavLink = (link: { href: string; label: string; icon: any; exact?: boolean; tab?: string }) => {
    const Icon = link.icon;
    const isActive = link.tab
      ? pathname === "/dashboard/business-os" && currentTab === link.tab
      : link.exact
      ? pathname === link.href
      : pathname === link.href || (pathname.startsWith(link.href + "/") && link.href !== "/dashboard");

    return (
      <Link
        key={link.href + (link.tab ? `?tab=${link.tab}` : "")}
        href={link.href}
        prefetch={true}
        className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
          isActive
            ? "bg-primary text-primary-foreground font-bold shadow-sm"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        {link.label}
      </Link>
    );
  };

  return (
    <nav className="space-y-4 px-4 text-xs pb-6">
      {/* Group 1: Core CRM */}
      <div className="space-y-1">
        <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
          Core CRM &amp; Pipeline
        </p>
        <div className="space-y-0.5">{coreCrmLinks.map(renderNavLink)}</div>
      </div>

      {/* Group 2: Sales Acceleration & Governance */}
      <div className="space-y-1">
        <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
          Sales Acceleration
        </p>
        <div className="space-y-0.5">{salesExecutionLinks.map(renderNavLink)}</div>
      </div>

      {/* Group 3: Growth & AI RevOps */}
      <div className="space-y-1">
        <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
          Growth &amp; AI RevOps
        </p>
        <div className="space-y-0.5">{growthAiLinks.map(renderNavLink)}</div>
      </div>

      {/* Group 4: Dynamic Custom Objects */}
      {customObjects.length > 0 && (
        <div className="space-y-1">
          <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
            Custom Entities
          </p>
          <div className="space-y-0.5">
            {customObjects.map((obj) =>
              renderNavLink({
                href: `/dashboard/objects/${obj.slug}`,
                label: obj.pluralName,
                icon: Boxes,
              })
            )}
          </div>
        </div>
      )}

      {/* Group 5: Industry Modules (if enabled) */}
      {verticalLinks.length > 0 && (
        <div className="space-y-1">
          <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
            Industry Modules
          </p>
          <div className="space-y-0.5">{verticalLinks.map(renderNavLink)}</div>
        </div>
      )}

      {/* Divider before Settings */}
      <div className="my-2 border-t border-border/60" />

      {/* Group 5: Settings & Billing */}
      <div className="space-y-1">
        <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
          Workspace
        </p>
        <div className="space-y-0.5">
          {renderNavLink({ href: "/dashboard/billing", label: "Billing & Plans", icon: CreditCard })}
          {renderNavLink({ href: "/dashboard/settings", label: "Settings & Team", icon: Settings })}
        </div>
      </div>
    </nav>
  );
}
