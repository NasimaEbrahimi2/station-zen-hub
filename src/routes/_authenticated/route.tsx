import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Fuel, LayoutDashboard, Receipt, Fuel as PumpIcon, Truck, BarChart3, Settings, FileText, Users, UserCog, Calculator, BookOpen, Building2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

const NAV = [
  { to: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { to: "/sale", label: "فروش جدید", icon: Receipt },
  { to: "/invoices", label: "فاکتورها", icon: FileText },
  { to: "/expenses", label: "مصارف", icon: Wallet },
  { to: "/vendors", label: "تأمین‌کنندگان", icon: Building2 },
  { to: "/customers", label: "مشتریان", icon: Users },
  { to: "/accounting", label: "حسابداری", icon: Calculator },
  { to: "/accounts", label: "دفتر حساب‌ها", icon: BookOpen },
  { to: "/pumps", label: "پمپ‌ها", icon: PumpIcon },
  { to: "/inventory", label: "خرید سوخت", icon: Truck },
  { to: "/employees", label: "کارمندان", icon: UserCog },
  { to: "/reports", label: "گزارش‌ها", icon: BarChart3 },
  { to: "/settings", label: "تنظیمات", icon: Settings },
] as const;

function Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [company, setCompany] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("company_profile")
        .select("name, logo_url")
        .maybeSingle();
      if (!data) {
        navigate({ to: "/onboarding/company", replace: true });
        return;
      }
      setCompany(data as any);
      setChecked(true);
    })();
  }, [navigate]);

  if (!checked) {
    return (
      <div className="min-h-screen grid place-items-center bg-background" dir="rtl">
        <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-l border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="logo" className="size-9 rounded-md object-cover shrink-0" />
          ) : (
            <div className="size-9 rounded-md bg-primary grid place-items-center shrink-0">
              <Fuel className="size-4 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-tight leading-none truncate">{company?.name || "جایگاه سوخت"}</p>
            <p className="text-[11px] text-muted-foreground mt-1">سیستم مدیریت پمپ بنزین</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center gap-2 p-3 border-b border-border bg-sidebar">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="logo" className="size-8 rounded-md object-cover shrink-0" />
          ) : (
            <div className="size-8 rounded-md bg-primary grid place-items-center shrink-0">
              <Fuel className="size-4 text-primary-foreground" />
            </div>
          )}
          <span className="font-semibold truncate">{company?.name || "جایگاه سوخت"}</span>
        </div>
        <div className="md:hidden overflow-x-auto border-b border-border bg-sidebar">
          <div className="flex gap-1 p-2 min-w-max">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                    active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
