import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Quoinv" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("company");
  const [saving, setSaving] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    name: "",
    currency: "USD",
    tax_rate: 0,
    invoice_prefix: "INV-",
    quotation_prefix: "QT-",
    brand_color: "#0A2540",
  });

  const [profileForm, setProfileForm] = useState<{ full_name: string; email: string }>({
    full_name: "",
    email: "",
  });

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["settings-company"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
      if (!profile?.company_id) throw new Error("No company");
      const { data: company } = await supabase.from("companies").select("*").eq("id", profile.company_id).maybeSingle();
      return company;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["settings-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name || "",
        currency: company.currency || "USD",
        tax_rate: company.tax_rate || 0,
        invoice_prefix: company.invoice_prefix || "INV-",
        quotation_prefix: company.quotation_prefix || "QT-",
        brand_color: company.brand_color || "#0A2540",
      });
    }
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        email: profile.email || "",
      });
    }
  }, [company, profile]);

  const updateCompany = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
      if (!profile?.company_id) throw new Error("No company");

      const { error } = await supabase
        .from("companies")
        .update({
          name: companyForm.name,
          currency: companyForm.currency,
          tax_rate: companyForm.tax_rate,
          invoice_prefix: companyForm.invoice_prefix,
          quotation_prefix: companyForm.quotation_prefix,
          brand_color: companyForm.brand_color,
        })
        .eq("id", profile.company_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Company settings updated");
      qc.invalidateQueries({ queryKey: ["settings-company"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name,
          email: profileForm.email,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["settings-profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSaveCompany = async () => {
    setSaving(true);
    await updateCompany.mutateAsync();
    setSaving(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile.mutateAsync();
    setSaving(false);
  };

  if (companyLoading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your company and account settings.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company name *</Label>
                  <Input
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    placeholder="Your company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={companyForm.currency}
                    onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                    placeholder="USD"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default tax rate (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={companyForm.tax_rate}
                    onChange={(e) => setCompanyForm({ ...companyForm, tax_rate: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Brand color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={companyForm.brand_color}
                      onChange={(e) => setCompanyForm({ ...companyForm, brand_color: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={companyForm.brand_color}
                      onChange={(e) => setCompanyForm({ ...companyForm, brand_color: e.target.value })}
                      placeholder="#0A2540"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCompany} disabled={saving || updateCompany.isPending} className="gap-2">
                  {(saving || updateCompany.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" /> Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving || updateProfile.isPending} className="gap-2">
                  {(saving || updateProfile.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" /> Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numbering" className="mt-6 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Invoice prefix</Label>
                  <Input
                    value={companyForm.invoice_prefix}
                    onChange={(e) => setCompanyForm({ ...companyForm, invoice_prefix: e.target.value })}
                    placeholder="INV-"
                  />
                  <p className="text-xs text-muted-foreground">Prefix for invoice numbers (e.g., INV-00001)</p>
                </div>
                <div className="space-y-2">
                  <Label>Quotation prefix</Label>
                  <Input
                    value={companyForm.quotation_prefix}
                    onChange={(e) => setCompanyForm({ ...companyForm, quotation_prefix: e.target.value })}
                    placeholder="QT-"
                  />
                  <p className="text-xs text-muted-foreground">Prefix for quotation numbers (e.g., QT-00001)</p>
                </div>
              </div>

              <div className="rounded-md bg-muted/40 p-4 text-sm">
                <p className="font-medium">Next numbers</p>
                <p className="mt-1 text-muted-foreground">
                  Next invoice: <span className="font-semibold">{companyForm.invoice_prefix}00001</span> · 
                  Next quotation: <span className="font-semibold">{companyForm.quotation_prefix}00001</span>
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCompany} disabled={saving || updateCompany.isPending} className="gap-2">
                  {(saving || updateCompany.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" /> Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}