import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Wallet, Plus, Printer, Copy, Send, Link2 } from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePDF, printPDF } from "@/lib/pdf-export";

export const Route = createFileRoute("/app/invoices/$id")({
  head: () => ({ meta: [{ title: "Invoice — Quoinv" }] }),
  component: InvoiceDetail,
});

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  partial: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function InvoiceDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data: inv, error } = await supabase
        .from("invoices").select("*, clients(name, email, address), companies(*)").eq("id", id).single();
      if (error) throw error;
      const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", id).order("position");
      return { inv, items: items ?? [], company: (inv as any).companies };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("invoices").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["invoice", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const amt = Number(payAmount);
      if (!amt || amt <= 0) throw new Error("Enter an amount greater than 0");
      const newPaid = Number(data.inv.amount_paid) + amt;
      const total = Number(data.inv.total);
      const status = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : data.inv.status;
      const { error } = await supabase.from("invoices")
        .update({ amount_paid: newPaid, status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setPayOpen(false);
      setPayAmount("");
      qc.invalidateQueries({ queryKey: ["invoice", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  const { inv, items } = data;
  const balance = Number(inv.total) - Number(inv.amount_paid ?? 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/app/invoices"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold">{inv.number}</h1>
              <Badge className={statusColors[inv.status]}>{inv.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Issued {inv.issue_date} · Due {inv.due_date ?? "—"}</p>
          </div>
        </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (!data) return;
              const html = generateInvoicePDF(data.inv, data.items, data.company, data.inv.clients);
              printPDF(html);
            }} className="gap-2">
              <Printer className="h-4 w-4" /> Print PDF
            </Button>
            {/* Duplicate Invoice */}
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/app/invoices/new" })} className="gap-2">
              <Copy className="h-4 w-4" /> Duplicate
            </Button>
            <Select value={inv.status} onValueChange={(v) => updateStatus.mutate(v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft","sent","viewed","partial","paid","overdue","cancelled"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={balance <= 0}><Wallet className="h-4 w-4" /> Record payment</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Balance due: <span className="font-semibold text-foreground">{formatMoney(balance)}</span></div>
                <Input type="number" min={0} step="0.01" placeholder="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending}>Record</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display">Bill to</CardTitle></CardHeader>
        <CardContent>
          <div className="font-medium">{(inv.clients as any)?.name}</div>
          <div className="text-sm text-muted-foreground">{(inv.clients as any)?.email}</div>
          <div className="text-sm text-muted-foreground">{(inv.clients as any)?.address}</div>
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
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(Number(inv.subtotal))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(Number(inv.tax_total))}</span></div>
            <div className="flex justify-between border-t pt-2 font-display text-lg font-bold"><span>Total</span><span>{formatMoney(Number(inv.total))}</span></div>
            <div className="flex justify-between text-success"><span>Paid</span><span>{formatMoney(Number(inv.amount_paid ?? 0))}</span></div>
            <div className="flex justify-between font-semibold"><span>Balance</span><span>{formatMoney(balance)}</span></div>
          </div>
          {inv.notes && <div className="mt-6 rounded-md bg-muted/40 p-3 text-sm">{inv.notes}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
