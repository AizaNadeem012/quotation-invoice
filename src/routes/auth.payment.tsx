import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";
import { createSafePayCheckout } from "@/lib/safepay-functions.server";

export const Route = createFileRoute("/auth/payment")({
  head: () => ({
    meta: [
      { title: "Complete your payment — Quoinv" },
      { name: "description", content: "Complete your subscription payment." },
    ],
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [safepayLoading, setSafepayLoading] = useState(false);

  // Get plan and user from sessionStorage on mount
  useEffect(() => {
    const plan = sessionStorage.getItem("selectedPlan");
    const userId = sessionStorage.getItem("pendingUserId");

    if (!plan || !userId) {
      navigate({ to: "/auth/plan" });
      return;
    }

    setSelectedPlan(plan);
    setPendingUserId(userId);

    // Verify user is still logged in
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session || data.session.user.id !== userId) {
        navigate({ to: "/auth" });
      }
    });
  }, [navigate]);

  // Fetch user data using React Query
  const { data: user } = useQuery({
    queryKey: ["payment-user", pendingUserId],
    queryFn: async () => {
      if (!pendingUserId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== pendingUserId) return null;
      return user;
    },
    enabled: !!pendingUserId,
  });

  const planDetails: { [key: string]: { name: string; price: number; period: string; features: string[] } } = {
    pro: {
      name: "Pro",
      price: 29,
      period: "per month",
      features: [
        "50 invoices per month",
        "50 quotations per month",
        "5 users",
        "Priority support",
        "Advanced reports",
        "No Quoinv branding",
      ],
    },
    enterprise: {
      name: "Enterprise",
      price: 99,
      period: "per month",
      features: [
        "Unlimited invoices",
        "Unlimited quotations",
        "Unlimited users",
        "24/7 support",
        "Custom integrations",
        "White-label",
      ],
    },
  };

  // Create company and setup account mutation
  const setupAccount = useMutation({
    mutationFn: async () => {
      if (!user || !selectedPlan) throw new Error("Missing user or plan data");

      const planInfo = planDetails[selectedPlan];
      if (!planInfo) throw new Error("Invalid plan selected");

      // Create company with selected plan
      const companyData: any = {
        name: `${user.email?.split("@")[0]}'s Company`,
        owner_id: user.id,
        currency: "USD",
        invoice_prefix: "INV",
        quotation_prefix: "QT",
        next_invoice_no: 1,
        next_quotation_no: 1,
        tax_rate: 0,
        plan: selectedPlan,
        subscription_status: "active",
      };
      
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert(companyData)
        .select("id")
        .single();

      if (companyError) throw companyError;

      // Update profile with company_id
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ company_id: company.id })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Assign owner role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: "owner",
        });

      if (roleError) throw roleError;

      return company.id;
    },
    onSuccess: () => {
      // Clear session storage
      sessionStorage.removeItem("selectedPlan");
      sessionStorage.removeItem("pendingUserId");
      
      toast.success(`Welcome to Quoinv ${selectedPlan} plan!`);
      navigate({ to: "/app/dashboard" });
    },
    onError: (e: any) => {
      console.error("Account setup error:", e);
      toast.error(e.message || "Failed to setup account. Please try again.");
    },
  });

  const handleSafePayCheckout = async () => {
    if (!user || !selectedPlan) return;

    const planInfo = planDetails[selectedPlan];
    if (!planInfo) return;

    setSafepayLoading(true);
    try {
      // Create a temporary invoice for the subscription payment
      const { data: tempInvoice, error: invError } = await supabase
        .from("invoices")
        .insert({
          company_id: "00000000-0000-0000-0000-000000000000", // Will be created after payment
          client_id: user.id,
          number: `SUB-${selectedPlan.toUpperCase()}-${Date.now()}`,
          status: "draft",
          subtotal: planInfo.price,
          tax_total: 0,
          total: planInfo.price,
          notes: `Subscription payment for ${planInfo.name} plan`,
        })
        .select("id")
        .single();

      if (invError) throw invError;

      const result = await createSafePayCheckout({
        data: {
          invoiceId: tempInvoice.id,
          invoiceNumber: `SUB-${selectedPlan.toUpperCase()}`,
          amount: planInfo.price,
          currency: "USD",
          clientName: user.email?.split("@")[0] || "User",
          clientEmail: user.email || "",
          successUrl: `${window.location.origin}/auth/payment?success=true&plan=${selectedPlan}`,
          cancelUrl: `${window.location.origin}/auth/payment?canceled=true&plan=${selectedPlan}`,
        }
      });

      if (result.success && result.checkout_url) {
        window.open(result.checkout_url, "_blank");
        toast.success("SafePay checkout opened in new tab");
      } else {
        toast.error(result.error || "Failed to create SafePay checkout");
      }
    } catch (error: any) {
      console.error("SafePay error:", error);
      toast.error(error.message || "Payment failed. Please try again.");
    } finally {
      setSafepayLoading(false);
    }
  };

  // Handle SafePay return redirects
  const searchParams = new URLSearchParams(window.location.search);
  useEffect(() => {
    const success = searchParams.get("success");
    const plan = searchParams.get("plan");

    if (success === "true" && plan && selectedPlan === plan) {
      // Payment was successful, setup the account
      toast.success("Payment successful! Setting up your account...");
      setupAccount.mutate();
      
      // Clean up URL
      window.history.replaceState({}, "", "/auth/payment");
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Payment was canceled. You can try again.");
      window.history.replaceState({}, "", "/auth/payment");
    }
  }, [searchParams, selectedPlan]);

  if (!selectedPlan || !planDetails[selectedPlan]) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Invalid plan selected</p>
          <Link to="/auth/plan">
            <Button className="mt-4">Select a plan</Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedPlanInfo = planDetails[selectedPlan];
  const isLoading = safepayLoading || setupAccount.isPending;

  return (

    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 text-primary-foreground md:flex" style={{ background: "var(--gradient-brand)" }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-white text-primary font-bold">Q</div>
          <span className="font-display text-lg font-bold">Quoinv</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">Complete your subscription</h2>
          <p className="mt-4 max-w-md text-primary-foreground/70">
            You're about to unlock the full power of Quoinv {selectedPlanInfo.name} plan.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/60">© 2026 Quoinv.com — By AbdullahDevDesign</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold">Complete your payment</h1>
            <p className="mt-2 text-muted-foreground">You're subscribing to the {selectedPlanInfo.name} plan</p>
          </div>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-display text-xl font-bold">{selectedPlanInfo.name} Plan</div>
                  <div className="text-sm text-muted-foreground">{selectedPlanInfo.period}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold">${selectedPlanInfo.price}</div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <ul className="space-y-2">
                  {selectedPlanInfo.features.map((feature: string) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 bg-muted/50">
            <CardContent className="p-4">
              <div className="text-sm">
                <div className="font-semibold mb-2">Payment Summary</div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${selectedPlanInfo.price}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between font-bold text-foreground mt-2 pt-2 border-t">
                  <span>Total</span>
                  <span>${selectedPlanInfo.price}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={handleSafePayCheckout}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay ${selectedPlanInfo.price} and get started
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate({ to: "/auth/plan" })}
              disabled={isLoading}
            >
              Back to plans
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Secure payment powered by SafePay. Your payment information is encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}