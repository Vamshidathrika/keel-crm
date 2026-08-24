import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizations, orgWidgets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import SessionProvider from "@/components/session-provider";
import {
  Ship,
  LayoutDashboard,
  DollarSign,
  Users,
  Building2,
  CheckSquare,
  Settings,
  LogOut,
  Bell,
  Search,
  Sparkles,
} from "lucide-react";
import SidebarNav from "./sidebar-nav";
import NotificationBell from "@/components/notification-bell";
import SearchCommandTrigger from "@/components/search-command-trigger";
import CopilotAssistant from "@/components/copilot-assistant";
import SearchCommand from "@/components/search-command";
import { BrandingProvider } from "@/components/branding-provider";
import { WIDGET_REGISTRY } from "@/lib/widgets/registry";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await auth();
  } catch (err) {
    console.error("Dashboard auth check error:", err);
  }

  if (!session?.user) {
    redirect("/login");
  }

  // Load Organization + Branding
  let org: any = null;
  let widgetRows: any[] = [];
  try {
    org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.user.orgId),
    });

    widgetRows = await db.query.orgWidgets.findMany({
      where: and(
        eq(orgWidgets.orgId, session.user.orgId),
        eq(orgWidgets.isEnabled, true)
      ),
    });
  } catch (err) {
    console.error("Dashboard DB load error:", err);
  }

  const branding = (org?.brandingConfig as any) ?? {};
  const appName = branding.appName || "Keel";
  const logoUrl = branding.logoUrl || null;
  const orgName = org?.name || "Keel Workspace";

  // If no widget rows yet → default to all core widgets
  const enabledWidgetKeys: string[] =
    widgetRows.length > 0
      ? widgetRows.map((r) => r.widgetKey)
      : WIDGET_REGISTRY.filter((w) => w.defaultFor === "all").map((w) => w.key);

  return (
    <SessionProvider session={session}>
      <BrandingProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
        {/* Sticky Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar shrink-0 h-screen sticky top-0 z-30 select-none">
          <div className="flex h-16 items-center gap-2 px-6 border-b border-border shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="w-8 h-8 rounded object-contain" />
            ) : (
              <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 border border-primary/20 text-primary">
                <Ship className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm leading-none truncate text-foreground">
                {appName}
              </span>
              <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                {orgName}
              </span>
            </div>
          </div>

          <div className="flex-1 py-4 overflow-y-auto scrollbar-thin">
            <SidebarNav role={session.user.role} enabledWidgetKeys={enabledWidgetKeys} />
          </div>

          <div className="p-4 border-t border-border bg-sidebar-accent/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {session.user.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate uppercase font-mono tracking-wider mt-0.5">
                  {session.user.role}
                </p>
              </div>
              <Link
                href="/api/auth/signout"
                className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shrink-0 z-40">
            {/* Search command bar trigger */}
            <div className="flex-1 max-w-md">
              <SearchCommandTrigger />
            </div>

            {/* Topbar Actions */}
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <NotificationBell />

              <div className="h-4 w-px bg-border hidden sm:block" />

              <span className="text-xs font-mono bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded capitalize hidden sm:block">
                {session.user.role} View
              </span>
            </div>
          </header>

          {/* Independent Scrollable Workarea */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>

        {/* Floating Cmd+K Copilot Chat Trigger & Pane */}
        <CopilotAssistant user={session.user} />
        <SearchCommand />
      </div>
      </BrandingProvider>
    </SessionProvider>
  );
}
