import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Plus, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createSafePayCheckout } from "@/lib/safepay-functions.server";

export const Route = createFileRoute("/app/payments")({
  head: () => ({ meta: [{ title: "Payments — Quoinv" }] }),
  component: PaymentsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    success: search.success as string | undefined,
    canceled: search.canceled as string | undefined,
    invoice: search.invoice as string | undefined,
  }),
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

function PaymentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [payOpen, setPayOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string>("");
  const [payAmount, setPayAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [safepayLoading, setSafepayLoading] = useState<string | null>(null);

  // Handle SafePay return redirects (success/cancel from hosted checkout)
  const search = useSearch({ from: Route.id });
  useEffect(() => {
    if (search.success === "true" && search.invoice) {
      toast.success("Payment was successful! The invoice will be updated shortly.");
      qc.invalidateQueries({ queryKey: ["payments-invoices"] });
      // Clean up URL params
      window.history.replaceState({}, "", "/app/payments");
    } else if (search.canceled === "true" && search.invoice) {
      toast.info("SafePay payment was canceled. You can try again anytime.");
      // Clean up URL params
      window.history.replaceState({}, "", "/app/payments");
    }
  }, [search.success, search.canceled, search.invoice]);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["payments-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, number, status, total, amount_paid, issue_date, due_date, clients(name)")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice) throw new Error("Select an invoice");
      const amt = Number(payAmount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");

      const { data: inv } = await supabase.from("invoices").select("total, amount_paid, status").eq("id", selectedInvoice).single();
      if (!inv) throw new Error("Invoice not found");

      const newPaid = Number(inv.amount_paid) + amt;
      const total = Number(inv.total);
      if (newPaid > total) throw new Error("Payment exceeds invoice total");

      const status = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : inv.status;

      const { error } = await supabase.from("invoices")
        .update({ amount_paid: newPaid, status })
        .eq("id", selectedInvoice);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      setPayOpen(false);
      setSelectedInvoice("");
      setPayAmount("");
      setPaymentMethod("cash");
      setPaymentNote("");
      qc.invalidateQueries({ queryKey: ["payments-invoices"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSafePay = async (inv: any) => {
    setSafepayLoading(inv.id);
    try {
      const amountToPay = Number(inv.total) - Number(inv.amount_paid ?? 0);
      
      const result = await createSafePayCheckout({
        data: {
          invoiceId: inv.id,
          invoiceNumber: inv.number,
          amount: amountToPay,
          currency: "PKR",
          clientName: inv.clients?.name || "Client",
          clientEmail: "",
          successUrl: `${window.location.origin}/app/payments?success=true&invoice=${inv.id}`,
          cancelUrl: `${window.location.origin}/app/payments?canceled=true&invoice=${inv.id}`,
        }
      });

      if (result.success && result.checkout_url) {
        window.open(result.checkout_url, "_blank");
        toast.success("SafePay checkout opened in new tab");
      } else {
        toast.error(result.error || "Failed to create SafePay checkout");
      }
    } catch (error: any) {
      toast.error(error.message || "SafePay payment failed");
    } finally {
      setSafepayLoading(null);
    }
  };

  const outstandingInvoices = invoices?.filter(i => Number(i.total) - Number(i.amount_paid ?? 0) > 0) ?? [];
  const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + (Number(i.total) - Number(i.amount_paid ?? 0)), 0);
  const totalPaid = invoices?.reduce((sum, i) => sum + Number(i.amount_paid ?? 0), 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Track and record payments from clients.</p>
        </div>
        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Record payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Invoice *</Label>
                <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {outstandingInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.number} — {inv.clients?.name ?? "Unknown"} (Balance: {formatMoney(Number(inv.total) - Number(inv.amount_paid ?? 0))})
                      </SelectItem>
                    ))}
                    {outstandingInvoices.length === 0 && (
                      <div className="px-2 py-2 text-xs text-muted-foreground">No outstanding invoices</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {selectedInvoice && (
                <>
                  <div>
                    <Label>Amount *</Label>
                    <Input 
                      type="number" 
                      min={0} 
                      step="0.01" 
                      placeholder="0.00" 
                      value={payAmount} 
                      onChange={(e) => setPayAmount(e.target.value)} 
                    />
                  </div>
                  <div>
                    <Label>Payment method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="payoneer">Payoneer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Note</Label>
                    <Input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Optional payment note" />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => recordPayment.mutate()} 
                disabled={!selectedInvoice || !payAmount || recordPayment.isPending}
              >
                {recordPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total outstanding</div>
            <div className="mt-2 font-display text-2xl font-bold text-warning">{formatMoney(totalOutstanding)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{outstandingInvoices.length} invoices</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total received</div>
            <div className="mt-2 font-display text-2xl font-bold text-success">{formatMoney(totalPaid)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{invoices?.length ?? 0} invoices</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No invoices yet. <Link to="/app/invoices/new" className="text-primary underline-offset-4 hover:underline">Create your first invoice</Link>.
            </div>
          ) : (
            <div className="divide-y">
              {invoices.map((inv) => {
                const balance = Number(inv.total) - Number(inv.amount_paid ?? 0);
                const isPaid = balance <= 0;
                return (
                  <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-muted/40">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Link to="/app/invoices/$id" params={{ id: inv.id }} className="font-medium text-primary hover:underline">{inv.number}</Link>
                        <Badge className={statusColors[inv.status]}>{inv.status}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {inv.clients?.name ?? "—"} · Issued {inv.issue_date} · Due {inv.due_date ?? "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium">{formatMoney(Number(inv.total))}</div>
                        <div className={`text-xs ${isPaid ? "text-success" : "text-warning"}`}>
                          {isPaid ? "Paid" : `Balance: ${formatMoney(balance)}`}
                        </div>
                      </div>
                      {!isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 shrink-0"
                          onClick={() => handleSafePay(inv)}
                          disabled={safepayLoading === inv.id}
                        >
                          {safepayLoading === inv.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3.5 w-3.5" />
                          )}
                          SafePay
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}