import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Quoinv" },
      { name: "description", content: "Sign in to your Quoinv workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if user already has a company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.company_id) {
        // User already has a company, go to dashboard
        navigate({ to: "/app/dashboard" });
      } else {
        // New user, show plan selection
        navigate({ to: "/auth/plan" });
      }
    };

    checkAndRedirect();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session) {
        // Check if user already has a company
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.company_id) {
          navigate({ to: "/app/dashboard" });
        } else {
          navigate({ to: "/auth/plan" });
        }
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate({ to: "/app/dashboard" });
    } catch (err: any) { 
      toast.error(err.message || "Invalid credentials"); 
    }
    finally { setLoading(false); }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 text-primary-foreground md:flex" style={{ background: "var(--gradient-brand)" }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-white text-primary font-bold">Q</div>
          <span className="font-display text-lg font-bold">Quoinv</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">Get paid faster.<br />Look more professional.</h2>
          <p className="mt-4 max-w-md text-primary-foreground/70">
            Send quotations, convert to invoices, accept payments and close your books — from one clean dashboard.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/60">© 2026 Quoinv.com — By AbdullahDevDesign</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold">Welcome to Quoinv</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace</p>

          <Card className="mt-6">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="you@company.com" 
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input 
                    type="password" 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm font-medium">Free Plan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              3 invoices per month · No credit card required
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to Quoinv's Terms & Privacy.
          </p>
        </div>
      </div>
    </div>
  );
}