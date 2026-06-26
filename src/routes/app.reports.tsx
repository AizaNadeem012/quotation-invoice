import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, TrendingUp, TrendingDown, DollarSign, FileText, Users } from "lucide-react";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports — Quoinv" }] }),
  component: ReportsPage,
});

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function ReportsPage() {
  const { data: stats } = useQuery({
    queryKey: ["reports-stats"],
    queryFn: async () => {
      const [{ data: invoices }, { data: quotations }, { data: clients }] = await Promise.all([
        supabase.from("invoices").select("total, amount_paid, status, issue_date"),
        supabase.from("quotations").select("id, status, issue_date"),
        supabase.from("clients").select("id, created_at"),
      ]);

      const inv = invoices ?? [];
      const totalRevenue = inv.reduce((a, i) => a + Number(i.amount_paid ?? 0), 0);
      const totalOutstanding = inv.reduce((a, i) => a + (Number(i.total) - Number(i.amount_paid ?? 0)), 0);
      const paidInvoices = inv.filter(i => i.status === "paid").length;
      const draftInvoices = inv.filter(i => i.status === "draft").length;

      return {
        totalRevenue,
        totalOutstanding,
        invoiceCount: inv.length,
        paidInvoices,
        draftInvoices,
        quotationCount: quotations?.length ?? 0,
        clientCount: clients?.length ?? 0,
      };
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const [{ data: recentInvoices }, { data: recentQuotations }] = await Promise.all([
        supabase.from("invoices")
          .select("id, number, status, total, issue_date, clients(name)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("quotations")
          .select("id, number, status, total, issue_date, clients(name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      return { recentInvoices: recentInvoices ?? [], recentQuotations: recentQuotations ?? [] };
    },
  });

  const tiles = [
    { label: "Total revenue", value: formatMoney(stats?.totalRevenue ?? 0), icon: DollarSign, accent: "text-success" },
    { label: "Outstanding", value: formatMoney(stats?.totalOutstanding ?? 0), icon: TrendingUp, accent: "text-warning" },
    { label: "Invoices", value: String(stats?.invoiceCount ?? 0), icon: FileText, accent: "text-primary" },
    { label: "Clients", value: String(stats?.clientCount ?? 0), icon: Users, accent: "text-primary" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Financial overview and insights.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</div>
                <t.icon className={`h-4 w-4 ${t.accent}`} />
              </div>
              <div className="mt-2 font-display text-2xl font-bold">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Invoice status breakdown</h3>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paid invoices</span>
                <span className="font-semibold text-success">{stats?.paidInvoices ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Draft invoices</span>
                <span className="font-semibold">{stats?.draftInvoices ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total invoices</span>
                <span className="font-semibold">{stats?.invoiceCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-medium">Total quotations</span>
                <span className="font-semibold">{stats?.quotationCount ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Financial summary</h3>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Revenue collected</span>
                <span className="font-semibold text-success">{formatMoney(stats?.totalRevenue ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Outstanding balance</span>
                <span className="font-semibold text-warning">{formatMoney(stats?.totalOutstanding ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-medium">Total invoiced</span>
                <span className="font-semibold">{formatMoney((stats?.totalRevenue ?? 0) + (stats?.totalOutstanding ?? 0))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-display text-lg font-semibold">Quick actions</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link to="/app/quotations/new">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" /> New quotation
              </Button>
            </Link>
            <Link to="/app/invoices/new">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" /> New invoice
              </Button>
            </Link>
            <Link to="/app/clients">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" /> Manage clients
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Recent invoices</h3>
              <Link to="/app/invoices" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {recentActivity?.recentInvoices && recentActivity.recentInvoices.length > 0 ? (
                recentActivity.recentInvoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{inv.number}</div>
                      <div className="text-xs text-muted-foreground">{inv.clients?.name ?? "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatMoney(Number(inv.total))}</div>
                      <div className="text-xs capitalize text-muted-foreground">{inv.status}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No invoices yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Recent quotations</h3>
              <Link to="/app/quotations" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {recentActivity?.recentQuotations && recentActivity.recentQuotations.length > 0 ? (
                recentActivity.recentQuotations.map((q: any) => (
                  <div key={q.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{q.number}</div>
                      <div className="text-xs text-muted-foreground">{q.clients?.name ?? "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatMoney(Number(q.total))}</div>
                      <div className="text-xs capitalize text-muted-foreground">{q.status}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No quotations yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}