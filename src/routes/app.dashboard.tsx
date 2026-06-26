import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowUpRight,
  FileText,
  Receipt,
  Users,
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  Calendar,
  DollarSign,
  CreditCard,
  BarChart3,
  ArrowRight,
  ChevronRight,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Quoinv" }] }),
  component: Dashboard,
});

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const qc = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);

  const setupCompany = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          owner_id: user.id,
          currency,
          tax_rate: 0,
          invoice_prefix: "INV-",
          quotation_prefix: "QT-",
        })
        .select("id")
        .single();
      if (companyError) throw companyError;
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          company_id: newCompany.id,
          full_name: user.user_metadata?.full_name || "",
          email: user.email,
        });
      if (profileError) throw profileError;
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, company_id: newCompany.id, role: "owner" });
      if (roleError) throw roleError;
      return newCompany;
    },
    onSuccess: () => {
      toast.success("Company setup complete!");
      qc.invalidateQueries();
      onComplete();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }
    setSaving(true);
    setupCompany.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/5 text-primary">
          <Building2 className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-bold">Welcome to Quoinv!</h1>
        <p className="mt-2 text-muted-foreground">
          Let's set up your company to get started
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This will appear on your invoices and quotations
              </p>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="PKR">PKR - Pakistani Rupee</option>
                <option value="INR">INR - Indian Rupee</option>
                <option value="AED">AED - UAE Dirham</option>
                <option value="SAR">SAR - Saudi Riyal</option>
              </select>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={saving || setupCompany.isPending}
              className="w-full"
            >
              {saving || setupCompany.isPending ? "Setting up..." : "Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function Dashboard() {
  const qc = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { data: companyCheck } = useQuery({
    queryKey: ["company-check"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { hasCompany: false };
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();
      return { hasCompany: !!profile?.company_id };
    },
  });

  useEffect(() => {
    if (companyCheck !== undefined) {
      setShowSetup(!companyCheck.hasCompany);
      setLoading(false);
    }
  }, [companyCheck]);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", dateRange, customStart, customEnd],
    queryFn: async () => {
      let dateFilter = "";
      if (dateRange === "7d") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        dateFilter = d.toISOString();
      } else if (dateRange === "30d") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        dateFilter = d.toISOString();
      } else if (dateRange === "90d") {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        dateFilter = d.toISOString();
      } else if (dateRange === "custom" && customStart) {
        dateFilter = customStart;
      }

      let invoiceQuery = supabase
        .from("invoices")
        .select("total, amount_paid, status, created_at");
      let quotationQuery = supabase.from("quotations").select("id, status");

      if (dateFilter) {
        invoiceQuery = invoiceQuery.gte("created_at", dateFilter);
        quotationQuery = quotationQuery.gte("created_at", dateFilter);
      }
      if (dateRange === "custom" && customEnd) {
        invoiceQuery = invoiceQuery.lte(
          "created_at",
          customEnd + "T23:59:59"
        );
        quotationQuery = quotationQuery.lte(
          "created_at",
          customEnd + "T23:59:59"
        );
      }

      const [
        { data: invoices },
        { data: quotations },
        { data: clients },
      ] = await Promise.all([
        invoiceQuery.order("created_at", { ascending: false }),
        quotationQuery.order("created_at", { ascending: false }),
        supabase.from("clients").select("id"),
      ]);
      const inv = invoices ?? [];
      const revenue = inv.reduce(
        (a, i) => a + Number(i.amount_paid ?? 0),
        0
      );
      const outstanding = inv.reduce(
        (a, i) => a + (Number(i.total) - Number(i.amount_paid ?? 0)),
        0
      );

      // Previous period comparison
      let revenueChange: number | null = null;
      if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate =
          dateRange === "custom" && customEnd
            ? new Date(customEnd)
            : new Date();
        const rangeMs = endDate.getTime() - startDate.getTime();
        const prevStart = new Date(startDate.getTime() - rangeMs);

        const { data: prevInvoices } = await supabase
          .from("invoices")
          .select("amount_paid")
          .gte("created_at", prevStart.toISOString())
          .lt("created_at", dateFilter);

        const prevRevenue = (prevInvoices ?? []).reduce(
          (a, i) => a + Number(i.amount_paid ?? 0),
          0
        );
        revenueChange =
          prevRevenue > 0
            ? ((revenue - prevRevenue) / prevRevenue) * 100
            : revenue > 0
            ? 100
            : 0;
      }

      // Monthly revenue for chart
      const monthly: Record<string, number> = {};
      inv.forEach((i) => {
        if (i.amount_paid && Number(i.amount_paid) > 0) {
          const month = i.created_at?.slice(0, 7) || "Unknown";
          monthly[month] = (monthly[month] || 0) + Number(i.amount_paid);
        }
      });
      const chartData = Object.entries(monthly)
        .slice(-6)
        .map(([month, revenue]) => ({
          month: month.slice(5),
          revenue,
        }));

      // Status breakdown
      const statusCounts: Record<string, number> = {};
      inv.forEach((i) => {
        statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
      });

      return {
        revenue,
        outstanding,
        revenueChange,
        invoiceCount: inv.length,
        quotationCount: quotations?.length ?? 0,
        clientCount: clients?.length ?? 0,
        chartData,
        statusCounts,
        totalInvoices: inv.length,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-invoices", dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, number, total, status, issue_date, clients(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const [invs, quots] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, number, status, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("quotations")
          .select("id, number, status, created_at, clients(name)")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      const items = [
        ...(invs.data?.map((i) => ({
          type: "invoice" as const,
          label: `Invoice ${i.number}`,
          detail: i.status,
          date: i.created_at,
        })) || []),
        ...(quots.data?.map((q) => ({
          type: "quotation" as const,
          label: `Quote ${q.number}`,
          detail: q.status,
          date: q.created_at,
        })) || []),
      ]
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        .slice(0, 5);
      return items;
    },
  });

  const metrics = [
    {
      label: "Total Revenue",
      value: formatMoney(stats?.revenue ?? 0),
      icon: DollarSign,
      change: stats?.revenueChange,
      prefix: "+",
    },
    {
      label: "Outstanding",
      value: formatMoney(stats?.outstanding ?? 0),
      icon: CreditCard,
      change: null,
    },
    {
      label: "Active Invoices",
      value: String(stats?.invoiceCount ?? 0),
      icon: Receipt,
      change: null,
    },
    {
      label: "Quotations",
      value: String(stats?.quotationCount ?? 0),
      icon: FileText,
      change: null,
    },
    {
      label: "Total Clients",
      value: String(stats?.clientCount ?? 0),
      icon: Users,
      change: null,
    },
  ];

  // Export CSV function
  const exportCSV = () => {
    if (!recent || recent.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = "Invoice,Client,Amount,Status,Date\n";
    const rows = recent
      .map(
        (i: any) =>
          `${i.number},${i.clients?.name || "Unknown"},${Number(
            i.total
          ).toFixed(2)},${i.status},${i.issue_date}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  // Chart component
  const maxVal = Math.max(
    ...(stats?.chartData?.map((d) => d.revenue) || []),
    1
  );

  if (loading)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading dashboard...
          </p>
        </div>
      </div>
    );

  return (
    <div>
      {showSetup ? (
        <SetupWizard onComplete={() => setShowSetup(false)} />
      ) : (
        <div className="space-y-8 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Here's what's happening with your business today.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="all">All time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="custom">Custom range</option>
                </select>
                {dateRange === "custom" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="h-9 w-36 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-9 w-36 text-xs"
                    />
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="gap-2"
              >
                <Download className="h-4 w-4" /> Export
              </Button>
              <Link to="/app/invoices/new">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> New Invoice
                </Button>
              </Link>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {metrics.map((m) => (
              <Card
                key={m.label}
                className="overflow-hidden border-border/60 transition-all hover:border-border hover:shadow-sm"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {m.label}
                    </span>
                    <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                      <m.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 font-display text-2xl font-bold tracking-tight">
                    {m.value}
                  </div>
                  {m.change !== null && m.change !== undefined && (
                    <div
                      className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
                        m.change >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {m.change >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>
                        {m.prefix || ""}
                        {Math.abs(m.change).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground font-normal">
                        vs prev period
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-7">
            {/* Revenue Chart */}
            <Card className="lg:col-span-4 border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-display text-base font-semibold">
                  Revenue Overview
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                    Revenue
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {stats?.chartData && stats.chartData.length > 0 ? (
                  <div className="mt-2">
                    <div className="flex items-end gap-2" style={{ height: "160px" }}>
                      {stats.chartData.map((d) => (
                        <div
                          key={d.month}
                          className="flex flex-1 flex-col items-center gap-1.5"
                        >
                          <div className="relative w-full max-w-[40px] rounded-md bg-muted-foreground/40 transition-all duration-500 hover:bg-muted-foreground/60" 
                            style={{ 
                              height: `${(d.revenue / maxVal) * 100}%`, 
                              minHeight: d.revenue > 0 ? "8px" : "0px" 
                            }} 
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {d.month}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                      <span>
                        Total:{" "}
                        <span className="font-semibold text-foreground">
                          {formatMoney(stats.revenue)}
                        </span>
                      </span>
                      {stats.revenueChange !== null &&
                        stats.revenueChange !== undefined && (
                          <span
                            className={`font-medium ${
                              stats.revenueChange >= 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {stats.revenueChange >= 0 ? "+" : ""}
                            {stats.revenueChange.toFixed(1)}% vs prev
                          </span>
                        )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No revenue data yet
                    </p>
                    <Link to="/app/invoices/new">
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-1 gap-1"
                      >
                        Create your first invoice{" "}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="lg:col-span-3 border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-display text-base font-semibold">
                  Invoice Status
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats?.statusCounts &&
                Object.keys(stats.statusCounts).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(stats.statusCounts).map(
                      ([status, count]) => {
                        const pct =
                          stats.totalInvoices > 0
                            ? (count / stats.totalInvoices) * 100
                            : 0;
                        const config: Record<
                          string,
                          { color: string; bg: string; label: string }
                        > = {
                          paid: {
                            color: "bg-emerald-500",
                            bg: "bg-emerald-50 dark:bg-emerald-950/30",
                            label: "Paid",
                          },
                          sent: {
                            color: "bg-blue-500",
                            bg: "bg-blue-50 dark:bg-blue-950/30",
                            label: "Sent",
                          },
                          draft: {
                            color: "bg-gray-400",
                            bg: "bg-gray-50 dark:bg-gray-800/30",
                            label: "Draft",
                          },
                          partial: {
                            color: "bg-amber-500",
                            bg: "bg-amber-50 dark:bg-amber-950/30",
                            label: "Partial",
                          },
                          overdue: {
                            color: "bg-red-500",
                            bg: "bg-red-50 dark:bg-red-950/30",
                            label: "Overdue",
                          },
                        };
                        const c = config[status] || {
                          color: "bg-gray-400",
                          bg: "bg-gray-50",
                          label: status,
                        };
                        return (
                          <div key={status} className={`rounded-lg p-3 ${c.bg}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-medium">
                                {c.label}
                              </span>
                              <span className="text-sm font-semibold">
                                {count}
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                  ({pct.toFixed(0)}%)
                                </span>
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-background/60">
                              <div
                                className={`h-full rounded-full ${c.color} transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Receipt className="h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No invoices yet
                    </p>
                    <Link to="/app/quotations/new">
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-1 gap-1"
                      >
                        Create a quotation{" "}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Invoices */}
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-display text-base font-semibold">
                  Recent Invoices
                </CardTitle>
                <Link
                  to="/app/invoices"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {!recent || recent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10">
                    <Receipt className="h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No invoices yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Create a quotation and convert it to an invoice
                    </p>
                    <Link to="/app/invoices/new">
                      <Button size="sm" className="mt-4 gap-1">
                        <Plus className="h-3.5 w-3.5" /> New Invoice
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y">
                    {recent.map((i: any, idx: number) => (
                      <Link
                        key={i.id}
                        to="/app/invoices/$id"
                        params={{ id: i.id }}
                        className={`flex items-center justify-between py-3.5 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-lg ${
                          idx === 0 ? "pt-0" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {i.number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {i.clients?.name ?? "No client"} ·{" "}
                              {i.issue_date}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatMoney(Number(i.total))}
                          </div>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                              i.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : i.status === "overdue"
                                ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                : i.status === "sent"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                                : i.status === "partial"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                : "bg-gray-50 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400"
                            }`}
                          >
                            {i.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-display text-base font-semibold">
                  Recent Activity
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {!activities || activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10">
                    <Activity className="h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No recent activity
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Your recent actions will appear here
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute bottom-0 left-[19px] top-0 w-px bg-border" />
                    <div className="space-y-1">
                      {activities.map((a, i) => (
                        <div
                          key={i}
                          className="relative flex items-start gap-4 pb-4 pl-0"
                        >
                          <div
                            className={`relative z-10 mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-background ${
                              a.type === "invoice"
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                                : "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
                            }`}
                          >
                            {a.type === "invoice" ? (
                              <Receipt className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5">
                            <div className="text-sm font-medium">
                              {a.label}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {a.detail}
                            </div>
                          </div>
                          <div className="pt-1.5 text-xs text-muted-foreground whitespace-nowrap">
                            {a.date?.slice(0, 10)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">
                  Quick Actions
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Common tasks to keep your business running
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/app/clients">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Users className="h-4 w-4" /> Add Client
                  </Button>
                </Link>
                <Link to="/app/quotations/new">
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="h-4 w-4" /> New Quotation
                  </Button>
                </Link>
                <Link to="/app/invoices/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> New Invoice
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}