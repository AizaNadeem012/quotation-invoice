import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/quotations/new")({
  head: () => ({ meta: [{ title: "New quotation — Quoinv" }] }),
  component: NewQuotationPage,
});

type Item = { description: string; quantity: number; unit_price: number; tax_rate: number };

function NewQuotationPage() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState<string>("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]);

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data ?? [];
    },
  });

  useEffect(() => {
    const def = new Date(); def.setDate(def.getDate() + 30);
    setExpiryDate(def.toISOString().slice(0, 10));
  }, []);

  const totals = useMemo(() => {
    let sub = 0, tax = 0;
    for (const it of items) {
      const amt = it.quantity * it.unit_price;
      sub += amt;
      tax += amt * (it.tax_rate / 100);
    }
    return { subtotal: sub, tax, total: sub + tax };
  }, [items]);

  function updateItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((p) => [...p, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]);
  }
  function removeItem(i: number) {
    setItems((p) => p.filter((_, idx) => idx !== i));
  }

  const save = useMutation({
    mutationFn: async (status: "draft" | "sent") => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
      if (!profile?.company_id) throw new Error("No company");

      const { data: company } = await supabase
        .from("companies").select("quotation_prefix, next_quotation_no").eq("id", profile.company_id).maybeSingle();
      if (!company) throw new Error("Company not found");
      const number = `${company.quotation_prefix}${String(company.next_quotation_no).padStart(5, "0")}`;
      await supabase.from("companies")
        .update({ next_quotation_no: company.next_quotation_no + 1 })
        .eq("id", profile.company_id);

      const { data: quote, error: qErr } = await supabase.from("quotations").insert({
        company_id: profile.company_id,
        client_id: clientId,
        number,
        status,
        issue_date: issueDate,
        expiry_date: expiryDate || null,
        subtotal: totals.subtotal,
        tax_total: totals.tax,
        total: totals.total,
        notes: notes || null,
        created_by: user.id,
      }).select("id").single();
      if (qErr) throw qErr;

      const itemRows = items.filter((it) => it.description.trim()).map((it, idx) => ({
        quotation_id: quote.id,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        tax_rate: it.tax_rate,
        amount: it.quantity * it.unit_price,
        position: idx,
      }));
      if (itemRows.length > 0) {
        const { error: iErr } = await supabase.from("quotation_items").insert(itemRows);
        if (iErr) throw iErr;
      }

      return quote.id;
    },
    onSuccess: (id) => {
      toast.success("Quotation saved");
      navigate({ to: "/app/quotations/$id", params: { id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canSave = !!clientId && items.some((i) => i.description.trim());

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold">New quotation</h1>
        <p className="text-sm text-muted-foreground">Build it, save as draft, or send when ready.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display">Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                {(!clients || clients.length === 0) && <div className="px-2 py-2 text-xs text-muted-foreground">Add a client first</div>}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Issue date</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
          <div><Label>Expiry date</Label><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Line items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem} className="gap-2"><Plus className="h-4 w-4" /> Add line</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Description</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Unit price</th>
                  <th className="px-2 py-2 text-right">Tax %</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-2"><Input value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Item or service" /></td>
                    <td className="px-2 py-2 w-24"><Input type="number" min={0} step="0.01" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} className="text-right" /></td>
                    <td className="px-2 py-2 w-32"><Input type="number" min={0} step="0.01" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} className="text-right" /></td>
                    <td className="px-2 py-2 w-24"><Input type="number" min={0} step="0.01" value={it.tax_rate} onChange={(e) => updateItem(i, { tax_rate: Number(e.target.value) })} className="text-right" /></td>
                    <td className="px-2 py-2 w-28 text-right font-medium">{(it.quantity * it.unit_price).toFixed(2)}</td>
                    <td className="px-2 py-2">
                      <Button variant="ghost" size="icon" onClick={() => removeItem(i)} disabled={items.length === 1}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{totals.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{totals.tax.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 font-display text-lg font-bold"><span>Total</span><span>{totals.total.toFixed(2)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, thank you, etc." />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={!canSave || save.isPending} onClick={() => save.mutate("draft")}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save as draft
        </Button>
        <Button disabled={!canSave || save.isPending} onClick={() => save.mutate("sent")}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save & mark sent
        </Button>
      </div>
    </div>
  );
}