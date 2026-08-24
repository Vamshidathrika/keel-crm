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

// Icon map for vertical widget nav entries
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "/dashboard/shipments": Ship,
  "/dashboard/revenue": TrendingUp,
  "/dashboard/properties": Home,
  "/dashboard/appointments": Calendar,
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
}

export default function SidebarNav({ role, enabledWidgetKeys = [] }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  // Overview & Agent Hub — always at top
  const overviewLink = { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true };
  const agentHubLink = { href: "/dashboard/agent-hub", label: "Agent Control Hub", icon: Bot };

  // Business OS group links
  const businessOsLinks = [
    { href: "/dashboard/growth", label: "Growth & Flywheel", icon: TrendingUp },
    { href: "/dashboard/quotas", label: "Quotas & Commission", icon: Target },
    { href: "/dashboard/cadences", label: "Sales Cadences", icon: ListOrdered },
    { href: "/dashboard/agent-hub", label: "Agent Control Hub", icon: Bot },
    { href: "/dashboard/deals", label: "CRM & Leads", icon: DollarSign },
    { href: "/dashboard/products", label: "Products & Catalog", icon: Package },
    { href: "/dashboard/business-os?tab=sales", label: "Sales & Invoices", icon: FileText, tab: "sales" },
    { href: "/dashboard/business-os?tab=inbox", label: "Inbox & Followups", icon: MessageCircle, tab: "inbox" },
    { href: "/dashboard/business-os?tab=projects", label: "Projects & Portal", icon: Briefcase, tab: "projects" },
    { href: "/dashboard/business-os?tab=insights", label: "AI Insights", icon: Sparkles, tab: "insights" },
  ];

  // Industry Vertical widgets
  const verticalLinks = React.useMemo(() => {
    return WIDGET_REGISTRY.filter(
      (w) =>
        w.hasNavEntry &&
        w.navHref &&
        w.navHref !== "/dashboard" &&
        !w.navHref.startsWith("/dashboard/deals") &&
        !w.navHref.startsWith("/dashboard/business-os") &&
        enabledWidgetKeys.includes(w.key)
    ).map((w) => ({
      href: w.navHref!,
      label: w.navLabel ?? w.label,
      icon: ICON_MAP[w.navHref!] ?? Package,
    }));
  }, [enabledWidgetKeys]);

  const settingsLink = { href: "/dashboard/settings", label: "Settings", icon: Settings };

  return (
    <nav className="space-y-4 px-4 text-xs">
      {/* Overview */}
      <div className="space-y-0.5">
        {(() => {
          const Icon = overviewLink.icon;
          const isActive = pathname === "/dashboard";
          return (
            <Link
              href={overviewLink.href}
              prefetch={true}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {overviewLink.label}
            </Link>
          );
        })()}
      </div>

      {/* Business OS group */}
      <div className="space-y-1">
        <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
          Business OS
        </p>
        <div className="space-y-0.5">
          {businessOsLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.tab
              ? pathname === "/dashboard/business-os" && currentTab === link.tab
              : pathname === link.href || pathname.startsWith(link.href + "/");

            return (
              <Link
                key={link.href}
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
          })}
        </div>
      </div>

      {/* Industry Modules group */}
      {verticalLinks.length > 0 && (
        <div className="space-y-1">
          <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
            Industry Modules
          </p>
          <div className="space-y-0.5">
            {verticalLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
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
            })}
          </div>
        </div>
      )}

      {/* Divider before Settings */}
      {verticalLinks.length > 0 && (
        <div className="my-2 border-t border-border/60" />
      )}

      {/* Billing & Subscriptions */}
      {(() => {
        const billingLink = { href: "/dashboard/billing", label: "Billing & Plans", icon: CreditCard };
        const Icon = billingLink.icon;
        const isActive = pathname === billingLink.href;
        return (
          <Link
            href={billingLink.href}
            prefetch={true}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors",
              isActive
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {billingLink.label}
          </Link>
        );
      })()}

      {/* Settings — always at bottom */}
      {(() => {
        const Icon = settingsLink.icon;
        const isActive = pathname === settingsLink.href || pathname.startsWith(settingsLink.href + "/");
        return (
          <Link
            href={settingsLink.href}
            prefetch={true}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors",
              isActive
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {settingsLink.label}
          </Link>
        );
      })()}
    </nav>
  );
}
