import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { Fuel, LayoutDashboard, Receipt, Fuel as PumpIcon, Truck, BarChart3, Settings, FileText, Users, UserCog } from "lucide-react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

const NAV = [
  { to: "/dashboard", en: "Dashboard", fa: "داشبورد", icon: LayoutDashboard },
  { to: "/sale", en: "New Sale", fa: "فروش جدید", icon: Receipt },
  { to: "/pumps", en: "Pumps", fa: "پمپ‌ها", icon: PumpIcon },
  { to: "/inventory", en: "Inventory / Purchases", fa: "خرید سوخت", icon: Truck },
  { to: "/customers", en: "Customers", fa: "مشتریان", icon: Users },
  { to: "/employees", en: "Employees", fa: "کارمندان", icon: UserCog },
  { to: "/reports", en: "Reports", fa: "گزارش‌ها", icon: BarChart3 },
  { to: "/invoices", en: "Invoices", fa: "فاکتورها", icon: FileText },
  { to: "/settings", en: "Settings", fa: "تنظیمات", icon: Settings },
] as const;

function Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const company = typeof window !== "undefined" ? localStorage.getItem("company_name") : null;
  const { lang, t } = useI18n();

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="size-9 rounded-md bg-primary grid place-items-center shrink-0">
            <Fuel className="size-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-tight leading-none truncate">{company || "PumpOps"}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{t("Station Console", "کنسول جایگاه")}</p>
          </div>
        </div>
        <div className="px-3 pt-3">
          <LanguageSwitcher className="w-full justify-center" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, en, fa, icon: Icon }) => {
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
                <span className="flex-1 truncate">{lang === "fa" ? fa : en}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-3 border-b border-border bg-sidebar">
          <div className="flex min-w-0 items-center gap-2">
            <div className="size-8 rounded-md bg-primary grid place-items-center shrink-0">
              <Fuel className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold truncate">{company || "PumpOps"}</span>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="md:hidden overflow-x-auto border-b border-border bg-sidebar">
          <div className="flex gap-1 p-2 min-w-max">
            {NAV.map(({ to, en, fa, icon: Icon }) => {
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
                  {lang === "fa" ? fa : en}
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
