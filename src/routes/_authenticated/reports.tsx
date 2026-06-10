import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview, getSalesInRange } from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";
import { fmtDate, fmtLiters, fmtMoney } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — PumpOps" }] }),
  component: ReportsPage,
});

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

function ReportsPage() {
  const today = new Date();
  const defaultFrom = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0,10));
  const [to, setTo] = useState(today.toISOString().slice(0,10));

  const overviewFn = useServerFn(getOverview);
  const rangeFn = useServerFn(getSalesInRange);
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => overviewFn() });
  const sales = useQuery({
    queryKey: ["sales", "range", from, to],
    queryFn: () => rangeFn({ data: { from: startOfDay(new Date(from)).toISOString(), to: endOfDay(new Date(to)).toISOString() } }),
  });

  const cfg = overview.data?.config;
  const pumps = overview.data?.pumps ?? [];
  const currency = cfg?.currency ?? "USD";
  const rows = (sales.data ?? []) as any[];

  const totals = useMemo(() => {
    let liters = 0, revenue = 0;
    rows.forEach((r) => { liters += Number(r.liters); revenue += Number(r.total); });
    return { liters, revenue, count: rows.length };
  }, [rows]);

  // Per pump within range
  const perPump = useMemo(() => {
    const map = new Map<number, { pump_number: number; liters: number; revenue: number; count: number }>();
    pumps.forEach((p) => map.set(p.pump_number, { pump_number: p.pump_number, liters: 0, revenue: 0, count: 0 }));
    rows.forEach((r) => {
      const e = map.get(r.pump_number);
      if (!e) return;
      e.liters += Number(r.liters); e.revenue += Number(r.total); e.count++;
    });
    return Array.from(map.values()).sort((a,b) => a.pump_number - b.pump_number);
  }, [rows, pumps]);

  // Group by day/week/month
  function groupBy(unit: "day" | "week" | "month") {
    const m = new Map<string, { key: string; liters: number; revenue: number }>();
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      let key: string;
      if (unit === "day") key = d.toISOString().slice(0,10);
      else if (unit === "month") key = d.toISOString().slice(0,7);
      else {
        const tmp = new Date(d); tmp.setHours(0,0,0,0);
        const day = tmp.getDay(); tmp.setDate(tmp.getDate() - day);
        key = tmp.toISOString().slice(0,10);
      }
      const e = m.get(key) ?? { key, liters: 0, revenue: 0 };
      e.liters += Number(r.liters); e.revenue += Number(r.total);
      m.set(key, e);
    });
    return Array.from(m.values()).sort((a,b) => a.key.localeCompare(b.key));
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Sales analysis by date range, pump, and period.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end gap-4 justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1"><Label htmlFor="f">From</Label><Input id="f" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="t">To</Label><Input id="t" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-right">
              <Stat label="Transactions" value={String(totals.count)} />
              <Stat label="Liters sold" value={fmtLiters(totals.liters)} />
              <Stat label="Revenue" value={fmtMoney(totals.revenue, currency)} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="day">
        <TabsList>
          <TabsTrigger value="day">Daily</TabsTrigger>
          <TabsTrigger value="week">Weekly</TabsTrigger>
          <TabsTrigger value="month">Monthly</TabsTrigger>
        </TabsList>
        {(["day","week","month"] as const).map((u) => (
          <TabsContent key={u} value={u}>
            <ChartCard data={groupBy(u)} currency={currency} unit={u} />
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Per-pump breakdown</CardTitle>
          <CardDescription>For the selected date range; lifetime totals below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-4">Pump</th>
                  <th className="pr-4">Current vol.</th>
                  <th className="pr-4">Capacity</th>
                  <th className="pr-4">Period liters</th>
                  <th className="pr-4">Period revenue</th>
                  <th className="pr-4">Lifetime liters</th>
                  <th>Lifetime revenue</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular">
                {pumps.map((p) => {
                  const r = perPump.find((x) => x.pump_number === p.pump_number);
                  return (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 pr-4">Pump {p.pump_number}</td>
                      <td className="pr-4">{fmtLiters(Number(p.current_volume))}</td>
                      <td className="pr-4">{fmtLiters(Number(p.capacity))}</td>
                      <td className="pr-4">{fmtLiters(r?.liters ?? 0)}</td>
                      <td className="pr-4">{fmtMoney(r?.revenue ?? 0, currency)}</td>
                      <td className="pr-4">{fmtLiters(Number(p.total_sold))}</td>
                      <td>{fmtMoney(Number(p.total_revenue), currency)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-primary/40 bg-primary/5 font-semibold">
                  <td className="py-2 pr-4">All pumps</td>
                  <td className="pr-4">{fmtLiters(pumps.reduce((a,p) => a + Number(p.current_volume), 0))}</td>
                  <td className="pr-4">{fmtLiters(pumps.reduce((a,p) => a + Number(p.capacity), 0))}</td>
                  <td className="pr-4">{fmtLiters(totals.liters)}</td>
                  <td className="pr-4">{fmtMoney(totals.revenue, currency)}</td>
                  <td className="pr-4">{fmtLiters(pumps.reduce((a,p) => a + Number(p.total_sold), 0))}</td>
                  <td>{fmtMoney(pumps.reduce((a,p) => a + Number(p.total_revenue), 0), currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sales in range ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr><th className="py-2 pr-4">Invoice</th><th className="pr-4">Date</th><th className="pr-4">Pump</th><th className="pr-4">Liters</th><th className="pr-4">Customer</th><th>Total</th></tr>
              </thead>
              <tbody className="font-mono tabular">
                {rows.slice(0, 200).map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-2 pr-4">{r.invoice_no}</td>
                    <td className="pr-4">{fmtDate(r.created_at)}</td>
                    <td className="pr-4">#{r.pump_number}</td>
                    <td className="pr-4">{fmtLiters(Number(r.liters))}</td>
                    <td className="pr-4">{r.customer_name ?? "Walk-in"}</td>
                    <td>{fmtMoney(Number(r.total), currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && <p className="text-xs text-muted-foreground mt-3">Showing first 200 of {rows.length}.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold font-mono tabular">{value}</p>
    </div>
  );
}

function ChartCard({ data, currency, unit }: { data: { key: string; liters: number; revenue: number }[]; currency: string; unit: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="capitalize">{unit} totals</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="key" stroke="var(--color-muted-foreground)" fontSize={11} />
            <YAxis yAxisId="l" stroke="var(--color-chart-1)" fontSize={11} />
            <YAxis yAxisId="r" orientation="right" stroke="var(--color-chart-2)" fontSize={11} />
            <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)" }}
              formatter={(v: any, name: string) => name === "Revenue" ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(v)) : `${Number(v).toFixed(2)} L`} />
            <Bar yAxisId="l" dataKey="liters" fill="var(--color-chart-1)" name="Liters" radius={[4,4,0,0]} />
            <Bar yAxisId="r" dataKey="revenue" fill="var(--color-chart-2)" name="Revenue" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
