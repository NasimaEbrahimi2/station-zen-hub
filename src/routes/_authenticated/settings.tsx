import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview, updateConfig } from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — PumpOps" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getOverview);
  const updateFn = useServerFn(updateConfig);
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => overviewFn() });
  const cfg = overview.data?.config;
  const isAdmin = (overview.data?.roles ?? []).includes("admin" as any);

  const [form, setForm] = useState({ fuel_price: 0, tank_capacity: 0, station_name: "", currency: "USD" });
  useEffect(() => {
    if (cfg) setForm({
      fuel_price: Number(cfg.fuel_price),
      tank_capacity: Number(cfg.tank_capacity),
      station_name: cfg.station_name,
      currency: cfg.currency,
    });
  }, [cfg]);

  const m = useMutation({
    mutationFn: (d: typeof form) => updateFn({ data: d }),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Station configuration. {!isAdmin && "Read-only — admin only."}</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Station</CardTitle><CardDescription>Used on invoices and reports.</CardDescription></CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); m.mutate(form); }}
            className="space-y-4"
          >
            <div className="space-y-2"><Label>Station name</Label>
              <Input value={form.station_name} disabled={!isAdmin} onChange={(e) => setForm({ ...form, station_name: e.target.value })} /></div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Currency</Label>
                <Input value={form.currency} disabled={!isAdmin} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
              <div className="space-y-2"><Label>Fuel price / L</Label>
                <Input type="number" min="0" step="0.001" value={form.fuel_price} disabled={!isAdmin} onChange={(e) => setForm({ ...form, fuel_price: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Tank capacity (L)</Label>
                <Input type="number" min="0" step="1" value={form.tank_capacity} disabled={!isAdmin} onChange={(e) => setForm({ ...form, tank_capacity: Number(e.target.value) })} /></div>
            </div>
            <Button type="submit" disabled={!isAdmin || m.isPending}>{m.isPending ? "Saving…" : "Save settings"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
