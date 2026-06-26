import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, FileText, Receipt, Wallet, BarChart3, ShieldCheck, Sparkles, ChevronDown, CheckCircle2, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quoinv — Quotations, Invoices & Accounting" },
      { name: "description", content: "Send quotations, convert to invoices, get paid, and close your books. Quoinv is the all-in-one billing platform for modern teams." },
      { property: "og:title", content: "Quoinv — Quotations, Invoices & Accounting" },
      { property: "og:description", content: "Send quotations, convert to invoices, get paid, and close your books." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: "Is Quoinv free to use?", a: "Yes! Our Free plan includes 3 invoices and 3 quotations per month, forever. No credit card required to start." },
    { q: "Can I convert a quotation to an invoice?", a: "Absolutely. When a client accepts your quotation, you can convert it to an invoice with a single click. All items and pricing carry over automatically." },
    { q: "What payment methods do you support?", a: "You can record payments via bank transfer, cash, card, check, Payoneer, and more. We track partial payments and automatically update invoice statuses." },
    { q: "Is my data secure?", a: "Yes. Quoinv uses row-level security with strict data isolation between companies. All data is encrypted in transit and at rest via Supabase." },
    { q: "Can I customize invoice numbering?", a: "Yes. In settings, you can set custom prefixes for both invoices and quotations (e.g., INV-2024-00001)." },
    { q: "Do you offer multi-user support?", a: "Yes. Pro and Enterprise plans support multiple users with role-based access (owner, manager, accountant, sales)." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold">Q</div>
            <span className="font-display text-lg font-bold">Quoinv</span>
          </Link>
          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
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
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground animate-pulse">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Built for freelancers, startups & enterprises
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] md:text-6xl">
              Quotations → Invoices → <span className="text-primary">Paid.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Quoinv is the modern way to send quotations, turn them into invoices, accept payments,
              and keep your accounting in one clean dashboard.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="gap-2">Start free <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <a href="#features"><Button size="lg" variant="outline">See features</Button></a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">No credit card required · 2 invoices free every month</p>
          </div>

          {/* Stats Preview */}
          <div className="mx-auto mt-16 max-w-5xl rounded-2xl border bg-card p-2 shadow-[var(--shadow-elev)]">
            <div className="rounded-xl border bg-card p-8">
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  { label: "Outstanding", value: "$48,200", sub: "12 invoices", bg: "bg-muted", textColor: "text-foreground" },
                  { label: "Paid this month", value: "$92,180", sub: "↑ 18% vs last", bg: "bg-muted", textColor: "text-foreground" },
                  { label: "Quotations sent", value: "37", sub: "9 accepted", bg: "bg-muted", textColor: "text-foreground" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg ${s.bg} p-5`}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</div>
                    <div className={`mt-2 font-display text-3xl font-bold ${s.textColor}`}>{s.value}</div>
                    <div className="mt-1 text-xs text-muted-foreground/70">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mx-auto mt-12 flex flex-wrap items-center justify-center gap-8 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> SOC 2 Compliant</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 99.9% Uptime</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> GDPR Ready</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Bank-level Encryption</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Everything you need to bill</h2>
          <p className="mt-3 text-muted-foreground">From the first quote to year-end reports.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: FileText, title: "Quotations", desc: "Build, send and track. Convert to invoice in one click when accepted." },
            { icon: Receipt, title: "Invoices", desc: "Auto-numbering, recurring, partial payments, taxes and PDF export." },
            { icon: Wallet, title: "Payments", desc: "Stripe, bank transfer, cash. Automatic status updates." },
            { icon: BarChart3, title: "Accounting", desc: "P&L, balance sheet, cash flow, general ledger, tax reports." },
            { icon: ShieldCheck, title: "Multi-tenant & RBAC", desc: "Strict data isolation. Roles for owner, manager, accountant, sales." },
            { icon: Sparkles, title: "AI assist", desc: "Draft quotations, write follow-ups, and get financial insights." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elev)] hover:-translate-y-0.5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/5 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold md:text-4xl">The Quoinv workflow</h2>
              <ol className="mt-8 space-y-6">
                {[
                  ["Create a client", "Add billing details once, reuse forever."],
                  ["Send a quotation", "Itemized, taxed, branded. Client approves online."],
                  ["Convert to invoice", "One click. Numbering, due dates and items carry over."],
                  ["Get paid & reconcile", "Track payments, write off, and close the books."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">{i + 1}</div>
                    <div>
                      <div className="font-semibold">{t}</div>
                      <div className="text-sm text-muted-foreground">{d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <div className="text-xs text-muted-foreground">Quotation</div>
                  <div className="font-display text-lg font-bold">QT-000041</div>
                </div>
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">Accepted</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Website redesign</span><span>$4,800.00</span></div>
                <div className="flex justify-between"><span>SEO setup (1× package)</span><span>$1,200.00</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Tax (10%)</span><span>$600.00</span></div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-xl font-bold">$6,600.00</span>
              </div>
              <Button className="mt-4 w-full gap-2">Convert to invoice <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Pricing that grows with you</h2>
          <p className="mt-3 text-muted-foreground">Start free. Upgrade when you're winning.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { 
              name: "Free", 
              price: "$0", 
              period: "forever",
              feats: ["3 invoices per month", "3 quotations per month", "1 user", "Basic support", "Quoinv branding"],
              highlight: false,
              color: "bg-gray-100 dark:bg-gray-800/50",
              textColor: "text-gray-800 dark:text-gray-200",
              badgeColor: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            },
            { 
              name: "Pro", 
              price: "$29", 
              period: "per month",
              feats: ["50 invoices per month", "50 quotations per month", "5 users", "Priority support", "Advanced reports", "No Quoinv branding"],
              highlight: true,
              color: "bg-blue-100 dark:bg-blue-900/30",
              textColor: "text-blue-800 dark:text-blue-200",
              badgeColor: "bg-blue-500/20 text-blue-700 dark:text-blue-300"
            },
            { 
              name: "Enterprise", 
              price: "$99", 
              period: "per month",
              feats: ["Unlimited invoices", "Unlimited quotations", "Unlimited users", "24/7 support", "Custom integrations", "White-label"],
              highlight: false,
              color: "bg-purple-100 dark:bg-purple-900/30",
              textColor: "text-purple-800 dark:text-purple-200",
              badgeColor: "bg-purple-200 text-purple-700 dark:bg-purple-700 dark:text-purple-300"
            },
          ].map((p) => (
            <div key={p.name} className={`relative rounded-2xl border-2 ${p.color} p-6 ${p.highlight ? "border-blue-500 shadow-lg ring-2 ring-blue-500/30 scale-105 md:scale-110" : "border-transparent shadow-md"}`}>
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white shadow-md">Most Popular</span>
                </div>
              )}
              <div className={`${p.highlight ? "mt-4" : ""}`}>
                <div className={`font-display text-xl font-bold ${p.textColor}`}>{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className={`font-display text-4xl font-bold ${p.textColor}`}>{p.price}</span>
                  <span className="text-sm text-muted-foreground">/{p.period}</span>
                </div>
              </div>
              <ul className="mt-6 space-y-3">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <svg className="h-4 w-4 shrink-0 mt-0.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className={`mt-6 w-full ${p.highlight ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-background border-2 border-input hover:border-muted-foreground text-foreground"}`}>
                  {p.name === "Free" ? "Get started" : "Upgrade"}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Frequently asked questions</h2>
            <p className="mt-3 text-muted-foreground">Everything you need to know about Quoinv.</p>
          </div>
          <div className="mt-12 space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left font-medium transition-colors hover:bg-muted/40"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="border-t px-6 py-4 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Ready to simplify your billing?</h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Join thousands of businesses that use Quoinv to send quotations, get paid, and close their books.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="gap-2">Get started free <ArrowRight className="h-4 w-4" /></Button></Link>
            <a href="#features"><Button size="lg" variant="outline">Learn more</Button></a>
          </div>
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div>© 2026 Quoinv.com — Made by Quoinv.com</div>
          <div>By AbdullahDevDesign</div>
        </div>
      </footer>
    </div>
  );
}