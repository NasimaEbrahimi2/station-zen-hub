import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview, getRecentSales, getSalesInRange } from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Fuel, TrendingUp, Droplet, DollarSign } from "lucide-react";
import { fmtLiters, fmtMoney } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PumpOps" }] }),
  component: Dashboard,
});

function Dashboard() {
  const overviewFn = useServerFn(getOverview);
  const recentFn = useServerFn(getRecentSales);
  const rangeFn = useServerFn(getSalesInRange);

  const overview = useQuery({ queryKey: ["overview"], queryFn: () => overviewFn() });
  const recent = useQuery({ queryKey: ["sales", "recent", 50], queryFn: () => recentFn({ data: { limit: 50 } }) });

  const now = new Date();
  const from = new Date(now); from.setDate(from.getDate() - 13); from.setHours(0,0,0,0);
  const sales14 = useQuery({
    queryKey: ["sales", "14d"],
    queryFn: () => rangeFn({ data: { from: from.toISOString(), to: now.toISOString() } }),
  });

  const cfg = overview.data?.config;
  const tank = overview.data?.tank;
  const pumps = overview.data?.pumps ?? [];
  const currency = cfg?.currency ?? "USD";

  // KPIs from last 50 sales for "today"
  const today = new Date(); today.setHours(0,0,0,0);
  const todaySales = (recent.data ?? []).filter((s) => new Date(s.created_at) >= today);
  const todayLiters = todaySales.reduce((a, s) => a + Number(s.liters), 0);
  const todayRevenue = todaySales.reduce((a, s) => a + Number(s.total), 0);
  const totalPumpVolume = pumps.reduce((a, p) => a + Number(p.current_volume), 0);

  // Build 14d daily aggregate
  const dayMap = new Map<string, { date: string; liters: number; revenue: number }>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(from); d.setDate(d.getDate() + i);
    const k = d.toISOString().slice(0, 10);
    dayMap.set(k, { date: k.slice(5), liters: 0, revenue: 0 });
  }
  (sales14.data ?? []).forEach((s) => {
    const k = new Date(s.created_at).toISOString().slice(0, 10);
    const e = dayMap.get(k); if (!e) return;
    e.liters += Number(s.liters); e.revenue += Number(s.total);
  });
  const chart = Array.from(dayMap.values());

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">{cfg?.station_name ?? "Fuel Station"} — real-time operations overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Droplet} label="Tank volume" value={tank ? fmtLiters(Number(tank.current_volume)) : "—"}
          sub={cfg ? `${Math.round((Number(tank?.current_volume ?? 0) / Number(cfg.tank_capacity)) * 100)}% of ${fmtLiters(Number(cfg.tank_capacity))}` : ""} />
        <Kpi icon={Fuel} label="Pumps total" value={fmtLiters(totalPumpVolume)} sub={`${pumps.length} pumps online`} />
        <Kpi icon={TrendingUp} label="Sold today" value={fmtLiters(todayLiters)} sub={`${todaySales.length} transactions`} />
        <Kpi icon={DollarSign} label="Revenue today" value={fmtMoney(todayRevenue, currency)} sub={`@ ${fmtMoney(Number(cfg?.fuel_price ?? 0), currency)}/L`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sales — last 14 days</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)" }} />
                <Bar dataKey="liters" fill="var(--color-chart-1)" name="Liters" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue — last 14 days</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)" }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Pump status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pumps.map((p) => {
              const pct = Math.min(100, (Number(p.current_volume) / Number(p.capacity)) * 100);
              const low = pct < 20;
              return (
                <div key={p.id} className="rounded-lg border border-border p-4 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`size-8 rounded-md grid place-items-center ${low ? "bg-destructive/20" : "bg-primary/15"}`}>
                        <Fuel className={`size-4 ${low ? "text-destructive" : "text-primary"}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Pump {p.pump_number}</p>
                        <p className="text-xs text-muted-foreground">Cap {fmtLiters(Number(p.capacity))}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm tabular">{fmtLiters(Number(p.current_volume))}</p>
                      <p className={`text-xs ${low ? "text-destructive" : "text-muted-foreground"}`}>{pct.toFixed(0)}%</p>
                    </div>
                  </div>
                  <Progress value={pct} className="mt-3 h-1.5" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <Icon className="size-4 text-primary" />
        </div>
        <p className="mt-2 text-2xl font-semibold font-mono tabular">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
