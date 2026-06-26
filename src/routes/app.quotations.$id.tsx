import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Receipt, Loader2, Printer, Copy } from "lucide-react";
import { toast } from "sonner";
import { generateQuotationPDF, printPDF } from "@/lib/pdf-export";

export const Route = createFileRoute("/app/quotations/$id")({
  head: () => ({ meta: [{ title: "Quotation — Quoinv" }] }),
  component: QuotationDetail,
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

function QuotationDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["quotation", id],
    queryFn: async () => {
      const { data: q, error } = await supabase
        .from("quotations").select("*, clients(name, email, address), companies(*)").eq("id", id).single();
      if (error) throw error;
      const { data: items } = await supabase.from("quotation_items").select("*").eq("quotation_id", id).order("position");
      return { quote: q, items: items ?? [] };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("quotations").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["quotation", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const convert = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("No quotation");
      const { quote, items } = data;
      const { data: company } = await supabase
        .from("companies").select("invoice_prefix, next_invoice_no").eq("id", quote.company_id).single();
      if (!company) throw new Error("Company not found");
      const number = `${company.invoice_prefix}${String(company.next_invoice_no).padStart(5, "0")}`;
      await supabase.from("companies").update({ next_invoice_no: company.next_invoice_no + 1 }).eq("id", quote.company_id);

      const due = new Date(); due.setDate(due.getDate() + 30);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: inv, error: iErr } = await supabase.from("invoices").insert({
        company_id: quote.company_id,
        client_id: quote.client_id,
        quotation_id: quote.id,
        number,
        status: "draft",
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: due.toISOString().slice(0, 10),
        subtotal: quote.subtotal,
        tax_total: quote.tax_total,
        total: quote.total,
        notes: quote.notes,
        created_by: user?.id ?? null,
      }).select("id").single();
      if (iErr) throw iErr;

      if (items.length > 0) {
        const rows = items.map((it, idx) => ({
          invoice_id: inv.id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          tax_rate: it.tax_rate,
          amount: it.amount,
          position: idx,
        }));
        await supabase.from("invoice_items").insert(rows);
      }

      await supabase.from("quotations").update({ status: "converted" }).eq("id", quote.id);
      return inv.id;
    },
    onSuccess: (invId) => {
      toast.success("Converted to invoice");
      window.location.href = `/app/invoices/${invId}`;
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  const { quote, items } = data;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/app/quotations"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold">{quote.number}</h1>
              <Badge className={statusColors[quote.status]}>{quote.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Issued {quote.issue_date} · Expires {quote.expiry_date ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (!data) return;
            const html = generateQuotationPDF(data.quote, data.items, data.quote.companies, data.quote.clients);
            printPDF(html);
          }} className="gap-2">
            <Printer className="h-4 w-4" /> Print PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/app/quotations/new" })} className="gap-2">
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          <select 
            value={quote.status} 
            onChange={(e) => updateStatus.mutate(e.target.value)}
            className="flex h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {["draft","sent","viewed","accepted","rejected","expired"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button
            onClick={() => convert.mutate()}
            disabled={convert.isPending || quote.status === "converted"}
            className="gap-2"
          >
            {convert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Receipt className="h-4 w-4" /> {quote.status === "converted" ? "Already converted" : "Convert to invoice"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display">Bill to</CardTitle></CardHeader>
        <CardContent>
          <div className="font-medium">{(quote.clients as any)?.name}</div>
          <div className="text-sm text-muted-foreground">{(quote.clients as any)?.email}</div>
          <div className="text-sm text-muted-foreground">{(quote.clients as any)?.address}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit</th>
                <th className="py-2 text-right">Tax</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id} className="border-t">
                  <td className="py-2">{it.description}</td>
                  <td className="py-2 text-right">{Number(it.quantity)}</td>
                  <td className="py-2 text-right">{formatMoney(Number(it.unit_price))}</td>
                  <td className="py-2 text-right">{Number(it.tax_rate)}%</td>
                  <td className="py-2 text-right">{formatMoney(Number(it.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(Number(quote.subtotal))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(Number(quote.tax_total))}</span></div>
            <div className="flex justify-between border-t pt-2 font-display text-lg font-bold"><span>Total</span><span>{formatMoney(Number(quote.total))}</span></div>
          </div>
          {quote.notes && <div className="mt-6 rounded-md bg-muted/40 p-3 text-sm">{quote.notes}</div>}
        </CardContent>
      </Card>
    </div>
  );
}