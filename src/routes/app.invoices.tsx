import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Printer, Search, Filter, X } from "lucide-react";
import { generateInvoicePDF, printPDF } from "@/lib/pdf-export";

export const Route = createFileRoute("/app/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Quoinv" }] }),
  component: InvoicesPage,
});

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  viewed: "bg-primary/10 text-primary",
  partial: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, number, status, issue_date, due_date, total, amount_paid, clients(name), companies(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((i: any) => {
    const matchesSearch = !search ||
      (i.number?.toLowerCase().includes(search.toLowerCase())) ||
      (i.clients?.name?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Bills sent to your clients.</p>
        </div>
        <Link to="/app/invoices/new"><Button className="gap-2"><Plus className="h-4 w-4" /> New invoice</Button></Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          {filtered.length} of {data?.length ?? 0} invoices
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-16 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
                <Printer className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No invoices yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create one by converting an accepted quotation or create manually.
                </p>
              </div>
              <Link to="/app/invoices/new">
                <Button variant="outline" size="sm" className="mt-2 gap-2">
                  <Plus className="h-4 w-4" /> Create invoice
                </Button>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No invoices match your search. Try adjusting your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Issued</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((i: any) => {
                    const balance = Number(i.total) - Number(i.amount_paid ?? 0);
                    return (
                      <tr key={i.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <Link to="/app/invoices/$id" params={{ id: i.id }} className="font-medium text-primary hover:underline">
                            {i.number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{i.clients?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{i.issue_date}</td>
                        <td className="px-4 py-3 text-muted-foreground">{i.due_date ?? "—"}</td>
                        <td className="px-4 py-3"><Badge className={statusColors[i.status]}>{i.status}</Badge></td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(Number(i.total))}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={balance <= 0 ? "text-success" : "text-warning"}>
                            {formatMoney(balance)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            const html = generateInvoicePDF(i, [], i.companies, i.clients);
                            printPDF(html);
                          }}>
                            <Printer className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}