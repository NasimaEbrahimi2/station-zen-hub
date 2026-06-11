import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDeliveries, getOverview, recordDelivery } from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Truck, Droplet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtDateTime, fmtLiters, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventory — PumpOps" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getOverview);
  const deliveriesFn = useServerFn(getDeliveries);
  const delFn = useServerFn(recordDelivery);

  const overview = useQuery({ queryKey: ["overview"], queryFn: () => overviewFn() });
  const deliveries = useQuery({ queryKey: ["deliveries"], queryFn: () => deliveriesFn() });

  const [liters, setLiters] = useState("");
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");

  const cfg = overview.data?.config;
  const tank = overview.data?.tank;
  const currency = cfg?.currency ?? "USD";
  const isAdmin = true;

  const capacity = Number(cfg?.tank_capacity ?? 0);
  const current = Number(tank?.current_volume ?? 0);
  const pct = capacity ? (current / capacity) * 100 : 0;

  const m = useMutation({
    mutationFn: (i: { liters: number; cost?: number; supplier: string }) => delFn({ data: i }),
    onSuccess: () => { toast.success("Delivery recorded"); setLiters(""); setCost(""); setSupplier(""); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(liters);
    if (!n || n <= 0) return toast.error("Enter liters");
    m.mutate({ liters: n, cost: cost ? Number(cost) : undefined, supplier });
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground mt-1">Main tank level and external deliveries.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Droplet className="size-5 text-accent" /> Main tank</CardTitle>
              <CardDescription>Capacity {fmtLiters(capacity)}</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-3xl font-mono tabular">{fmtLiters(current)}</p>
              <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% full</p>
            </div>
          </div>
        </CardHeader>
        <CardContent><Progress value={pct} className="h-3" /></CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Truck className="size-5 text-primary" /> Record delivery</CardTitle>
            <CardDescription>Add fuel arriving from supplier into the tank.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2"><Label>Liters</Label><Input type="number" min="0" step="0.01" value={liters} onChange={(e) => setLiters(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Total cost (optional)</Label><Input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
              <div className="space-y-2"><Label>Supplier (optional)</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
              <div className="flex items-end"><Button type="submit" className="w-full" disabled={m.isPending}>{m.isPending ? "Saving…" : "Record"}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Delivery history</CardTitle></CardHeader>
        <CardContent>
          {(deliveries.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr><th className="py-2 pr-4">When</th><th className="pr-4">Supplier</th><th className="pr-4">Liters</th><th className="pr-4">Cost</th><th>Tank before → after</th></tr>
                </thead>
                <tbody className="font-mono tabular">
                  {(deliveries.data as any[]).map((d) => (
                    <tr key={d.id} className="border-b border-border/50">
                      <td className="py-2 pr-4">{fmtDateTime(d.created_at)}</td>
                      <td className="pr-4">{d.supplier ?? "—"}</td>
                      <td className="pr-4">{fmtLiters(Number(d.liters))}</td>
                      <td className="pr-4">{d.cost ? fmtMoney(Number(d.cost), currency) : "—"}</td>
                      <td>{fmtLiters(Number(d.previous_volume))} → {fmtLiters(Number(d.new_volume))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
