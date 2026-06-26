import { createFileRoute, Outlet, redirect, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, FileText, Receipt, Wallet, BarChart3, Settings, LogOut, Building2, Moon, Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AppLayout,
});

const navItems = [
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
  { title: "Clients", url: "/app/clients", icon: Users },
  { title: "Quotations", url: "/app/quotations", icon: FileText },
  { title: "Invoices", url: "/app/invoices", icon: Receipt },
  { title: "Payments", url: "/app/payments", icon: Wallet },
  { title: "Reports", url: "/app/reports", icon: BarChart3 },
  { title: "Settings", url: "/app/settings", icon: Settings },
];

function AppSidebar({ companyName, plan }: { companyName: string; plan: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary/10 text-primary",
    enterprise: "bg-success/10 text-success",
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-primary font-bold">Q</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-semibold text-sidebar-foreground">Quoinv</div>
              <div className="truncate text-[11px] text-sidebar-foreground/60">{companyName}</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = path === item.url || path.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className={`rounded-md px-3 py-2 text-[11px] font-medium ${planColors[plan] || planColors.free}`}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)} plan
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("Workspace");
  const [plan, setPlan] = useState("free");
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      
      // Check if user has a company
      const { data: profile } = await supabase
        .from("profiles").select("company_id, companies(name, plan)").eq("id", user.id).maybeSingle();
      const joined = profile as unknown as { companies?: { name?: string; plan?: string } } | null;
      
      if (joined?.companies?.name) {
        setCompanyName(joined.companies.name);
        setPlan(joined.companies.plan || "free");
      } else {
        // Don't auto-create - let the Setup Wizard handle it
        setCompanyName("Setup Required");
        setPlan("free");
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar companyName={companyName} plan={plan} />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
                <Building2 className="h-4 w-4" />
                <span>{companyName}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const isDark = document.documentElement.classList.toggle("dark");
                  localStorage.setItem("quoinv-theme", isDark ? "dark" : "light");
                }}
                title="Toggle theme"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </header>
          <main className="flex-1 bg-muted/30">
            <Outlet />
          </main>
          <footer className="border-t bg-background py-3 text-center text-xs text-muted-foreground">
            © 2026 Quoinv.com — Made by Quoinv.com · By AbdullahDevDesign
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
