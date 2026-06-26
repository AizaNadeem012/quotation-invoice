import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/auth/plan")({
  head: () => ({
    meta: [
      { title: "Choose your plan — Quoinv" },
      { name: "description", content: "Select the perfect plan for your business." },
    ],
  }),
  component: PlanSelectionPage,
});

function PlanSelectionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Get user on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
      } else {
        setPendingUserId(data.session.user.id);
      }
    });
  }, [navigate]);

  // Fetch user data using React Query
  const { data: user } = useQuery({
    queryKey: ["plan-user", pendingUserId],
    queryFn: async () => {
      if (!pendingUserId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== pendingUserId) return null;
      return user;
    },
    enabled: !!pendingUserId,
  });

  // Create free account mutation
  const createFreeAccount = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not found");

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // Create company with free plan
      const companyData: any = {
        name: `${user.email?.split("@")[0]}'s Company`,
        owner_id: user.id,
        currency: "USD",
        invoice_prefix: "INV",
        quotation_prefix: "QT",
        next_invoice_no: 1,
        next_quotation_no: 1,
        tax_rate: 0,
        plan: "free",
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
      toast.success("Welcome to Quoinv! Your free account is ready.");
      navigate({ to: "/app/dashboard" });
    },
    onError: (e: any) => {
      console.error("Error creating free plan:", e);
      toast.error(e.message || "Failed to create account");
      setSelectedPlan(null);
    },
  });

  const initiatePayment = async (plan: string) => {
    try {
      // Store selected plan in sessionStorage for after payment
      if (user) {
        sessionStorage.setItem("selectedPlan", plan);
        sessionStorage.setItem("pendingUserId", user.id);

        // Redirect to payment page
        navigate({ to: "/auth/payment" });
      }
    } catch (err: any) {
      console.error("Error initiating payment:", err);
      toast.error(err.message || "Failed to initiate payment");
      setSelectedPlan(null);
    }
  };

  const handleSelectPlan = async (plan: string) => {
    setSelectedPlan(plan);

    try {
      if (plan === "free") {
        // Free plan - create company and go to dashboard
        await createFreeAccount.mutateAsync();
      } else {
        // Paid plan - redirect to payment
        await initiatePayment(plan);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to select plan");
      setSelectedPlan(null);
    }
  };

  const plans: Array<{
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    highlight: boolean;
    color: string;
    borderColor: string;
    buttonColor: string;
  }> = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out Quoinv",
      features: [
        "3 invoices per month",
        "3 quotations per month",
        "1 user",
        "Basic support",
        "Quoinv branding",
      ],
      highlight: false,
      color: "bg-gray-50 dark:bg-gray-900/50",
      borderColor: "border-gray-200 dark:border-gray-800",
      buttonColor: "bg-background border-2 border-input hover:border-muted-foreground",
    },
    {
      name: "Pro",
      price: "$29",
      period: "per month",
      description: "For growing businesses",
      features: [
        "50 invoices per month",
        "50 quotations per month",
        "5 users",
        "Priority support",
        "Advanced reports",
        "No Quoinv branding",
      ],
      highlight: true,
      color: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-500",
      buttonColor: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "per month",
      description: "For large organizations",
      features: [
        "Unlimited invoices",
        "Unlimited quotations",
        "Unlimited users",
        "24/7 support",
        "Custom integrations",
        "White-label",
      ],
      highlight: false,
      color: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-500",
      buttonColor: "bg-background border-2 border-input hover:border-muted-foreground",
    },
  ];

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 text-primary-foreground md:flex" style={{ background: "var(--gradient-brand)" }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-white text-primary font-bold">Q</div>
          <span className="font-display text-lg font-bold">Quoinv</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">Choose your plan</h2>
          <p className="mt-4 max-w-md text-primary-foreground/70">
            Start free and upgrade when you're ready. All plans include a 14-day money-back guarantee.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/60">© 2026 Quoinv.com — By AbdullahDevDesign</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold">Select your plan</h1>
            <p className="mt-2 text-muted-foreground">Choose the plan that works best for you</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.color} ${plan.borderColor} border-2 ${plan.highlight ? "shadow-lg scale-105" : ""}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="text-center">
                    <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline justify-center gap-1">
                      <span className="font-display text-4xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">/{plan.period}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`mt-6 w-full ${plan.buttonColor}`}
                    onClick={() => handleSelectPlan(plan.name.toLowerCase())}
                    disabled={selectedPlan === plan.name.toLowerCase() && (createFreeAccount.isPending || !!sessionStorage.getItem("selectedPlan"))}
                  >
                    {selectedPlan === plan.name.toLowerCase() && createFreeAccount.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : selectedPlan === plan.name.toLowerCase() && !!sessionStorage.getItem("selectedPlan") ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        {plan.name === "Free" ? "Get started" : "Upgrade to " + plan.name}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By selecting a plan, you agree to Quoinv's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}