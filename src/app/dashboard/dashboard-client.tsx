"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  User,
  Users,
  Flame,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Ship,
  Home,
  Calendar as CalendarIcon,
  FileText,
  Briefcase,
  ShoppingCart,
  CreditCard,
  Puzzle,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateDailyBrief } from "@/app/actions/ai";
import { toast } from "sonner";

type FunnelItem = { stageName: string; value: number; color: string };
type ForecastItem = { month: string; value: number };
type LeaderboardItem = { name: string; value: number };

interface DashboardClientProps {
  funnelData: FunnelItem[];
  forecastData: ForecastItem[];
  leaderboardData: LeaderboardItem[];
  hotLeads: any[];
  recentActivities: any[];
  deals: any[];
  stages: any[];
  enabledWidgetKeys?: string[];
  businessType?: string;
}

export default function DashboardClient({
  funnelData = [],
  forecastData = [],
  leaderboardData = [],
  hotLeads = [],
  recentActivities = [],
  deals = [],
  stages = [],
  enabledWidgetKeys = [],
  businessType = "logistics",
}: DashboardClientProps) {
  // What-If forecasting state
  const defaultProbabilities = React.useMemo(() => {
    const map: Record<string, number> = {};
    (stages || []).forEach((st) => {
      map[st.id] = st.probability ?? 10;
    });
    return map;
  }, [stages]);

  const [probabilities, setProbabilities] = React.useState<Record<string, number>>(defaultProbabilities);

  // Sync state if stages change
  React.useEffect(() => {
    setProbabilities(defaultProbabilities);
  }, [defaultProbabilities]);

  const calculatedForecast = React.useMemo(() => {
    const forecastMap: Record<string, number> = {};
    for (const d of (deals || [])) {
      if (!d.expectedCloseDate) continue;
      const month = d.expectedCloseDate.slice(0, 7); // YYYY-MM
      const st = (stages || []).find((s) => s.id === d.stageId);
      if (!st || st.type === "lost") continue;
      
      const prob = st.type === "won" ? 100 : (probabilities[d.stageId] !== undefined ? probabilities[d.stageId] : (d.probability ?? 10));
      const weight = prob / 100;
      const weightedVal = d.value * weight;
      
      forecastMap[month] = (forecastMap[month] || 0) + weightedVal;
    }
    
    return Object.entries(forecastMap)
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(0, 6);
  }, [deals, stages, probabilities]);

  const dynamicForecastTarget = React.useMemo(() => {
    return calculatedForecast.reduce((sum, f) => sum + f.value, 0);
  }, [calculatedForecast]);

  const totalPipeline = funnelData.reduce((sum, f) => sum + f.value, 0);

  const formatCurrency = (v: number) => {
    return `₹${v.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/20 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm backdrop-blur">
        {/* Spotlights for background premium feel */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-ai/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Welcome back to Keel <Zap className="w-5 h-5 text-ai fill-ai/10 animate-bounce" />
          </h2>
          <p className="text-xs text-muted-foreground max-w-lg">
            The AI-native sales copilot keeping every shipping and operations deal on course.
          </p>
        </div>
        <div className="flex gap-2 relative z-10 items-center">
          <Button
            size="sm"
            onClick={async () => {
              toast.loading("Structuring dashboard statistics...", { id: "briefing-toast" });
              try {
                await generateDailyBrief();
                toast.success("AI Morning Briefing created! Check the notification bell.", { id: "briefing-toast" });
              } catch (err) {
                toast.error("Failed to generate brief.", { id: "briefing-toast" });
              }
            }}
            className="text-xs bg-ai hover:bg-ai/90 text-ai-foreground border border-ai/20 flex items-center gap-1.5 shadow-sm hover:scale-[1.02] transition-transform"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Morning AI Brief
          </Button>
          <Link href="/dashboard/deals">
            <Button size="sm" variant="outline" className="text-xs border-border/80 hover:border-primary/30 shadow-xs">
              Deals
            </Button>
          </Link>
          <Link href="/dashboard/contacts">
            <Button size="sm" variant="outline" className="text-xs border-border/80 hover:border-primary/30 shadow-xs">
              Contacts
            </Button>
          </Link>
        </div>
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:20px_20px] pointer-events-none" />
      </div>

      {/* Main Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Pipeline Value",
            value: formatCurrency(totalPipeline),
            sub: "Active unclosed opportunities",
            icon: DollarSign,
            color: "text-primary bg-primary/10 border-primary/20",
          },
          {
            label: "Forecast Target",
            value: formatCurrency(dynamicForecastTarget),
            sub: "Weighted by stage closure",
            icon: TrendingUp,
            color: "text-ai bg-ai/10 border-ai/20",
          },
          {
            label: "Sales Reps",
            value: leaderboardData.length || 3,
            sub: "Active lead owners",
            icon: User,
            color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
          },
          {
            label: "Priority Actions",
            value: hotLeads.length,
            sub: "Scored hot lead contacts",
            icon: Flame,
            color: "text-destructive bg-destructive/10 border-destructive/20",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-border/70 bg-card hover-lift shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg border ${s.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                    {s.label}
                  </span>
                  <p className="text-lg font-bold text-foreground font-mono mt-0.5">{s.value}</p>
                  <span className="text-[10px] text-muted-foreground/80 truncate block">{s.sub}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Funnel Chart */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-5 border-b border-border bg-muted/10">
            <CardTitle className="text-sm font-bold">Pipeline Stage Funnel</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Volume value of deals standing in each default stage.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="stageName" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111726", borderColor: "#1F2937", borderRadius: "6px" }}
                  labelStyle={{ color: "#9CA3AF", fontSize: "11px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#F9FAFB", fontSize: "11px" }}
                  formatter={(value: any) => [formatCurrency(value), "Value"]}
                />
                <Bar dataKey="value" fill="#2F5DFF" radius={[4, 4, 0, 0]} maxBarSize={45}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || "#2F5DFF"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Forecast chart */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-5 border-b border-border bg-muted/10">
            <CardTitle className="text-sm font-bold">Weighted Revenue Forecast</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Forecast estimates for expected closing deal values by month.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-72">
            {calculatedForecast.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                Set expected close dates on deals to render forecast charts.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calculatedForecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E8A33D" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#E8A33D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111726", borderColor: "#1F2937", borderRadius: "6px" }}
                    labelStyle={{ color: "#9CA3AF", fontSize: "11px", fontFamily: "monospace" }}
                    itemStyle={{ color: "#F9FAFB", fontSize: "11px" }}
                    formatter={(value: any) => [formatCurrency(value), "Forecast"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#E8A33D"
                    fillOpacity={1}
                    fill="url(#colorForecast)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Interactive What-If Simulator */}
      <Card className="border border-border bg-card">
        <CardHeader className="p-5 border-b border-border bg-muted/10">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-ai" /> Interactive What-If Forecaster
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Adjust stage win probabilities on the fly to simulate pipeline adjustments in real time.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(stages || [])
              .filter(st => st.type === "open")
              .map(st => (
                <div key={st.id} className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color || "#3b82f6" }} />
                      {st.name}
                    </span>
                    <span className="font-mono text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
                      {probabilities[st.id] ?? st.probability}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={probabilities[st.id] ?? st.probability ?? 10}
                    onChange={(e) => setProbabilities({ ...probabilities, [st.id]: parseInt(e.target.value) })}
                    className="w-full premium-slider ai-slider cursor-pointer outline-none mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/80 font-mono">
                    <span>0% (Worst)</span>
                    <span>100% (Best)</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Widget Panels */}
      {enabledWidgetKeys.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Puzzle className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Workspace Modules</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipment tracker card */}
            {enabledWidgetKeys.includes("shipment_tracker") && (
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <Ship className="w-4 h-4 text-primary" /> Active Cargo Transits
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground mt-0.5">Active carrier logs</CardDescription>
                  </div>
                  <Link href="/dashboard/shipments" className="text-[10px] text-primary font-semibold hover:underline">View tracker &rarr;</Link>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">Copper Ore - Valparaiso</span>
                    <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px]">ETA: 08-05</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">Electronics - Shenzhen</span>
                    <span className="font-mono bg-success/10 text-success px-1.5 py-0.5 rounded text-[9px]">Arrived</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SaaS MRR metrics */}
            {enabledWidgetKeys.includes("mrr_dashboard") && (
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-primary" /> MRR Summary
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground mt-0.5">SaaS growth indicators</CardDescription>
                  </div>
                  <Link href="/dashboard/revenue" className="text-[10px] text-primary font-semibold hover:underline">View MRR &rarr;</Link>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 border border-border rounded bg-muted/10">
                    <p className="text-[9px] text-muted-foreground">MRR</p>
                    <p className="font-bold text-foreground mt-0.5">₹24,50,000</p>
                  </div>
                  <div className="p-2 border border-border rounded bg-muted/10">
                    <p className="text-[9px] text-muted-foreground">Annual Run Rate</p>
                    <p className="font-bold text-foreground mt-0.5">₹2.94 Cr</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Property list */}
            {enabledWidgetKeys.includes("property_listings") && (
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-primary" /> Active Properties
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground mt-0.5">Residential portfolio</CardDescription>
                  </div>
                  <Link href="/dashboard/properties" className="text-[10px] text-primary font-semibold hover:underline">View catalog &rarr;</Link>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">3BHK Apartment - Gachibowli</span>
                    <span className="font-bold text-primary">₹1.85 Cr</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">Luxury Villa - Whisper Valley</span>
                    <span className="font-bold text-primary">₹6.80 Cr</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appointments */}
            {enabledWidgetKeys.includes("appointment_tracker") && (
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-primary" /> Schedule
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground mt-0.5">Clinical consultation logs</CardDescription>
                  </div>
                  <Link href="/dashboard/appointments" className="text-[10px] text-primary font-semibold hover:underline">View agenda &rarr;</Link>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold">Rajesh Y. - Cardiology</span>
                    <span className="font-mono text-muted-foreground text-[10px]">07-20 10:30</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold">Anitha C. - Pediatrics</span>
                    <span className="font-mono text-muted-foreground text-[10px]">07-18 14:15</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CPQ builder */}
            {enabledWidgetKeys.includes("cpq_builder") && (
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" /> Compiled Quotes
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground mt-0.5">BOM cost proposals</CardDescription>
                  </div>
                  <Link href="/dashboard/quotes" className="text-[10px] text-primary font-semibold hover:underline">View CPQ &rarr;</Link>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">Precision Auto Components</span>
                    <span className="font-bold text-foreground">₹60,00,000</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">Apex Castings Inc.</span>
                    <span className="font-bold text-foreground">₹36,00,000</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Consulting project tracker */}
            {enabledWidgetKeys.includes("project_tracker") && (
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-primary" /> Active Projects
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground mt-0.5">Consulting Deliverables</CardDescription>
                  </div>
                  <Link href="/dashboard/projects" className="text-[10px] text-primary font-semibold hover:underline">View status &rarr;</Link>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">ERP Implementation Strategy</span>
                    <span className="font-mono text-muted-foreground text-[10px]">42 hrs</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">Compensation Structuring</span>
                    <span className="font-mono text-muted-foreground text-[10px]">18 hrs</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* E-commerce order tracker */}
            {enabledWidgetKeys.includes("order_tracker") && (
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-primary" /> Order Feed
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground mt-0.5">Completed Checkouts</CardDescription>
                  </div>
                  <Link href="/dashboard/orders" className="text-[10px] text-primary font-semibold hover:underline">View orders &rarr;</Link>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">Harish Rao</span>
                    <span className="font-mono text-success font-bold">₹12,499</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">Devashish Sen</span>
                    <span className="font-mono text-success font-bold">₹18,900</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KYC compliance tracker */}
            {enabledWidgetKeys.includes("kyc_tracker") && (
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 border-b border-border bg-muted/10 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-primary" /> Client KYC
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground mt-0.5">Document audits</CardDescription>
                  </div>
                  <Link href="/dashboard/kyc" className="text-[10px] text-primary font-semibold hover:underline">View audits &rarr;</Link>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">Vamsi Krishna</span>
                    <span className="font-mono text-success font-bold text-[9px]">Approved</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border">
                    <span className="font-semibold truncate">Meenakshi Exports Ltd.</span>
                    <span className="font-mono text-ai font-bold text-[9px]">Pending</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Bottom Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hot Leads */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 border-b border-border bg-muted/10">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-ai">
              <Flame className="w-4 h-4 text-ai animate-pulse" /> Hot Lead Actions
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Highly scored profiles requiring active human reachout.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {hotLeads.map((hl) => (
              <div
                key={hl.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 text-xs"
              >
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/contacts?id=${hl.id}`}
                    className="font-semibold text-foreground hover:underline truncate block"
                  >
                    {hl.firstName} {hl.lastName || ""}
                  </Link>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    {hl.email || hl.phone}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded border border-ai/30 text-ai bg-ai/10 font-bold font-mono text-[10px]">
                  Score {hl.score}
                </span>
              </div>
            ))}
            {hotLeads.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic text-center py-6">
                No hot leads detected. Compute lead scores inside contacts panel.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Won Leaderboard */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 border-b border-border bg-muted/10">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Won Leaderboard
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Total closed won revenue completed by deal owners.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {leaderboardData.map((rep, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground font-bold">{idx + 1}.</span>
                  <span className="font-semibold text-foreground">{rep.name}</span>
                </div>
                <span className="font-semibold font-mono text-emerald-500">
                  {formatCurrency(rep.value)}
                </span>
              </div>
            ))}
            {leaderboardData.length === 0 && (
              <p className="text-[11px] text-muted-foreground/60 italic text-center py-6">
                No revenue logged won yet this cycle.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 border-b border-border bg-muted/10">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <Clock className="w-4 h-4 text-muted-foreground" /> Workspace Timeline
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Latest timeline activities submitted by staff and integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="p-2.5 rounded-lg border border-border bg-card text-[11px] leading-normal"
              >
                <p className="text-muted-foreground truncate">{act.body}</p>
                <div className="flex justify-between items-center text-[9px] text-muted-foreground/75 font-mono mt-1.5">
                  <span>By: {act.actorUserId?.name || "System"}</span>
                  <span>{new Date(act.occurredAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-[11px] text-muted-foreground/60 italic text-center py-6">
                No logs recorded yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Minimal button stub to bypass importing Shadcn buttons with react-19 mismatches in charts
function Cell(props: any) {
  const { fill } = props;
  return <rect {...props} fill={fill} />;
}

function Button({ children, className, variant, size, ...props }: any) {
  return (
    <button
      className={`px-3 py-1.5 rounded border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
