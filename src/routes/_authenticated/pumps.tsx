import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview, getRefills, recordRefill, refillPumpToFull } from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Fuel } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtLiters, fmtMoney, fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pumps")({
  head: () => ({ meta: [{ title: "Pumps — PumpOps" }] }),
  component: PumpsPage,
});

function PumpsPage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getOverview);
  const refillsFn = useServerFn(getRefills);
  const refillFn = useServerFn(recordRefill);
  const fullFn = useServerFn(refillPumpToFull);
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => overviewFn() });
  const refills = useQuery({ queryKey: ["refills"], queryFn: () => refillsFn() });

  const pumps = overview.data?.pumps ?? [];
  const cfg: any = overview.data?.config;
  const currency = cfg?.currency ?? "USD";
  const tankVol = Number(overview.data?.tank?.current_volume ?? 0);
  const threshold = Number(cfg?.low_threshold ?? 10);
  const iran = Number(cfg?.iranian_pct ?? 0);
  const rus = Number(cfg?.russian_pct ?? 0);
  const arab = Number(cfg?.arabic_pct ?? 0);

  const [openId, setOpenId] = useState<string | null>(null);
  const [amt, setAmt] = useState("");

  const m = useMutation({
    mutationFn: (input: { pump_id: string; liters: number }) => refillFn({ data: input }),
    onSuccess: () => { toast.success("Pump refilled"); setOpenId(null); setAmt(""); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });
  const mFull = useMutation({
    mutationFn: (input: { pump_id: string }) => fullFn({ data: input }),
    onSuccess: () => { toast.success("Pump refilled to full"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Pumps <span className="text-muted-foreground text-lg" dir="rtl">/ پمپ‌ها</span></h1>
        <p className="text-sm text-muted-foreground mt-1">
          Refill pumps from tank ({fmtLiters(tankVol)} available). Low-fuel threshold: {fmtLiters(threshold)}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pumps.map((p) => {
          const cv = Number(p.current_volume);
          const cap = Number(p.capacity);
          const pct = Math.min(100, (cv / cap) * 100);
          const low = cv <= threshold;
          const open = openId === p.id;
          return (
            <Card key={p.id} className={low ? "border-destructive/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-md grid place-items-center ${low ? "bg-destructive/15" : "bg-primary/15"}`}>
                      <Fuel className={`size-5 ${low ? "text-destructive" : "text-primary"}`} />
                    </div>
                    <div>
                      <CardTitle>Pump {p.pump_number}</CardTitle>
                      <p className="text-xs text-muted-foreground">Capacity {fmtLiters(cap)}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-mono tabular">{pct.toFixed(0)}%</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={pct} className="h-2" />

                {low && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs">
                    <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-destructive">Low fuel — at or below {fmtLiters(threshold)}</p>
                      <Button size="sm" variant="destructive" className="mt-2 h-7"
                        disabled={mFull.isPending} onClick={() => mFull.mutate({ pump_id: p.id })}>
                        Refill to full
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Stat k="Current" v={fmtLiters(cv)} />
                  <Stat k="Sold total" v={fmtLiters(Number(p.total_sold))} />
                  <Stat k="Revenue" v={fmtMoney(Number(p.total_revenue), currency)} />
                  <Stat k="Available" v={fmtLiters(cap - cv)} />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Origin blend</p>
                  <div className="flex h-2 rounded overflow-hidden border border-border">
                    <div className="bg-emerald-500" style={{ width: `${iran}%` }} title={`Iranian ${iran}%`} />
                    <div className="bg-sky-500" style={{ width: `${rus}%` }} title={`Russian ${rus}%`} />
                    <div className="bg-amber-500" style={{ width: `${arab}%` }} title={`Arabic ${arab}%`} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 flex gap-2">
                    <span>🟢 IR {iran}%</span><span>🔵 RU {rus}%</span><span>🟡 AR {arab}%</span>
                  </p>
                </div>

                {!open ? (
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => setOpenId(p.id)}>Refill custom amount</Button>
                ) : (
                  <form
                    onSubmit={(e) => { e.preventDefault(); const n = Number(amt); if (!n || n <= 0) return toast.error("Enter liters"); m.mutate({ pump_id: p.id, liters: n }); }}
                    className="space-y-2"
                  >
                    <Label htmlFor={`r-${p.id}`}>Liters to add</Label>
                    <div className="flex gap-2">
                      <Input id={`r-${p.id}`} autoFocus type="number" min="0" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} />
                      <Button type="submit" size="sm" disabled={m.isPending}>Add</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setOpenId(null); setAmt(""); }}>Cancel</Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent refills</CardTitle></CardHeader>
        <CardContent>
          {(refills.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No refills yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr><th className="py-2 pr-4">When</th><th className="pr-4">Pump</th><th className="pr-4">Liters</th><th className="pr-4">Tank before → after</th><th>Pump before → after</th></tr>
                </thead>
                <tbody className="font-mono tabular">
                  {(refills.data as any[]).map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 pr-4">{fmtDateTime(r.created_at)}</td>
                      <td className="pr-4">#{r.pumps?.pump_number}</td>
                      <td className="pr-4">{fmtLiters(Number(r.liters))}</td>
                      <td className="pr-4">{fmtLiters(Number(r.tank_before))} → {fmtLiters(Number(r.tank_after))}</td>
                      <td>{fmtLiters(Number(r.pump_before))} → {fmtLiters(Number(r.pump_after))}</td>
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

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="font-mono tabular">{v}</p>
    </div>
  );
}
