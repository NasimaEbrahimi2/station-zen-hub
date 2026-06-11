import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { Fuel, LayoutDashboard, Receipt, Fuel as PumpIcon, Truck, BarChart3, Settings, FileText, Users, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", fa: "داشبورد", icon: LayoutDashboard },
  { to: "/sale", label: "New Sale", fa: "فروش جدید", icon: Receipt },
  { to: "/pumps", label: "Pumps", fa: "پمپ‌ها", icon: PumpIcon },
  { to: "/inventory", label: "Inventory / Purchases", fa: "خرید سوخت", icon: Truck },
  { to: "/customers", label: "Customers", fa: "مشتریان", icon: Users },
  { to: "/employees", label: "Employees", fa: "کارمندان", icon: UserCog },
  { to: "/reports", label: "Reports", fa: "گزارش‌ها", icon: BarChart3 },
  { to: "/invoices", label: "Invoices", fa: "فاکتورها", icon: FileText },
  { to: "/settings", label: "Settings", fa: "تنظیمات", icon: Settings },
] as const;

function Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const company = typeof window !== "undefined" ? localStorage.getItem("company_name") : null;

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="size-9 rounded-md bg-primary grid place-items-center">
            <Fuel className="size-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold tracking-tight leading-none truncate">{company || "PumpOps"}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Station Console / کنسول جایگاه</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, fa, icon: Icon }) => {
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
                <span className="flex-1">{label}</span>
                <span className="text-[11px] opacity-70" dir="rtl">{fa}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between p-3 border-b border-border bg-sidebar">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary grid place-items-center">
              <Fuel className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold truncate">{company || "PumpOps"}</span>
          </div>
        </div>
        <div className="md:hidden overflow-x-auto border-b border-border bg-sidebar">
          <div className="flex gap-1 p-2 min-w-max">
            {NAV.map(({ to, label, fa, icon: Icon }) => {
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
                  {label} <span dir="rtl" className="opacity-70">/ {fa}</span>
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
