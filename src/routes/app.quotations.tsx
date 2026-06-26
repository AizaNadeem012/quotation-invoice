import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, X, FileText } from "lucide-react";

export const Route = createFileRoute("/app/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Quoinv" }] }),
  component: QuotationsPage,
});

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  viewed: "bg-primary/10 text-primary",
  accepted: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-warning/10 text-warning",
  converted: "bg-success/10 text-success",
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("id, number, status, issue_date, expiry_date, total, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((q: any) => {
    const matchesSearch = !search ||
      (q.number?.toLowerCase().includes(search.toLowerCase())) ||
      (q.clients?.name?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Quotations</h1>
          <p className="text-sm text-muted-foreground">Send, track, and convert to invoices.</p>
        </div>
        <Link to="/app/quotations/new"><Button className="gap-2"><Plus className="h-4 w-4" /> New quotation</Button></Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quotations..."
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
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          {filtered.length} of {data?.length ?? 0} quotations
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-16 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No quotations yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first quotation to send to a client.
                </p>
              </div>
              <Link to="/app/quotations/new">
                <Button variant="outline" size="sm" className="mt-2 gap-2">
                  <Plus className="h-4 w-4" /> Create quotation
                </Button>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No quotations match your search. Try adjusting your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Issued</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((q: any) => (
                    <tr key={q.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link to="/app/quotations/$id" params={{ id: q.id }} className="font-medium text-primary hover:underline">{q.number}</Link>
                      </td>
                      <td className="px-4 py-3">{q.clients?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{q.issue_date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{q.expiry_date ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[q.status] ?? ""}>{q.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(Number(q.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Outlet />
    </div>
  );
}