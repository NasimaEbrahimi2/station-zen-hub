import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview, getRecentSales } from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { fmtDateTime, fmtLiters, fmtMoney } from "@/lib/format";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/invoices/")({
  head: () => ({ meta: [{ title: "Invoices — PumpOps" }] }),
  component: InvoicesList,
});

function InvoicesList() {
  const overviewFn = useServerFn(getOverview);
  const recentFn = useServerFn(getRecentSales);
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => overviewFn() });
  const sales = useQuery({ queryKey: ["sales", "recent", 200], queryFn: () => recentFn({ data: { limit: 200 } }) });
  const currency = overview.data?.config?.currency ?? "USD";
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = (sales.data ?? []) as any[];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((r) =>
      r.invoice_no.toLowerCase().includes(s) ||
      (r.customer_name ?? "").toLowerCase().includes(s) ||
      (r.vehicle_plate ?? "").toLowerCase().includes(s) ||
      String(r.pump_number).includes(s),
    );
  }, [sales.data, q]);

  return (
    <div className="p-4 md:p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">All customer invoices. Click any to view & print.</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <CardTitle className="flex items-center gap-2"><Receipt className="size-5 text-primary" /> {filtered.length} invoices</CardTitle>
            <Input className="max-w-xs" placeholder="Search invoice / customer / plate" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="pr-4">When</th>
                  <th className="pr-4">Pump</th>
                  <th className="pr-4">Liters</th>
                  <th className="pr-4">Customer</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/40">
                    <td className="py-2 pr-4">
                      <Link to="/invoices/$id" params={{ id: r.id }} className="text-primary underline-offset-4 hover:underline font-mono tabular">
                        {r.invoice_no}
                      </Link>
                    </td>
                    <td className="pr-4 font-mono tabular">{fmtDateTime(r.created_at)}</td>
                    <td className="pr-4">#{r.pump_number}</td>
                    <td className="pr-4 font-mono tabular">{fmtLiters(Number(r.liters))}</td>
                    <td className="pr-4">{r.customer_name ?? "Walk-in"}{r.vehicle_plate ? ` · ${r.vehicle_plate}` : ""}</td>
                    <td className="font-mono tabular">{fmtMoney(Number(r.total), currency)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
