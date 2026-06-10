import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview, recordSale } from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Fuel } from "lucide-react";
import { fmtLiters, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sale")({
  head: () => ({ meta: [{ title: "New sale — PumpOps" }] }),
  component: SalePage,
});

function SalePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const overviewFn = useServerFn(getOverview);
  const saleFn = useServerFn(recordSale);
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => overviewFn() });

  const [pumpId, setPumpId] = useState<string>("");
  const [liters, setLiters] = useState<string>("");
  const [customer, setCustomer] = useState("");
  const [plate, setPlate] = useState("");

  const cfg = overview.data?.config;
  const pumps = overview.data?.pumps ?? [];
  const currency = cfg?.currency ?? "USD";
  const price = Number(cfg?.fuel_price ?? 0);
  const litersN = Number(liters || 0);
  const total = litersN * price;

  const m = useMutation({
    mutationFn: (input: { pump_id: string; liters: number; customer_name: string; vehicle_plate: string }) =>
      saleFn({ data: input }),
    onSuccess: (sale: any) => {
      toast.success(`Sale recorded — ${sale.invoice_no}`);
      qc.invalidateQueries();
      navigate({ to: "/invoices/$id", params: { id: sale.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to record sale"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pumpId) return toast.error("Select a pump");
    if (!litersN || litersN <= 0) return toast.error("Enter liters > 0");
    m.mutate({ pump_id: pumpId, liters: litersN, customer_name: customer, vehicle_plate: plate });
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">New sale</h1>
        <p className="text-sm text-muted-foreground mt-1">Record a fuel dispense and generate the invoice.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select pump</CardTitle>
            <CardDescription>Pump volume updates instantly after the sale.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pumps.map((p) => {
                const selected = p.id === pumpId;
                const low = Number(p.current_volume) < 50;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPumpId(p.id)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10 glow-amber"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Fuel className={`size-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">#{p.pump_number}</span>
                    </div>
                    <p className="mt-3 text-lg font-semibold">Pump {p.pump_number}</p>
                    <p className={`text-sm font-mono tabular ${low ? "text-destructive" : "text-muted-foreground"}`}>
                      {fmtLiters(Number(p.current_volume))}
                    </p>
                  </button>
                );
              })}
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="l">Liters</Label>
                  <Input id="l" type="number" step="0.01" min="0" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Price per liter</Label>
                  <Input value={fmtMoney(price, currency)} readOnly className="bg-muted" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c">Customer name (optional)</Label>
                  <Input id="c" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pl">Vehicle plate (optional)</Label>
                  <Input id="pl" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC-1234" />
                </div>
              </div>
              <Button type="submit" disabled={m.isPending || !pumpId || !litersN} className="w-full sm:w-auto">
                {m.isPending ? "Recording…" : "Record sale & generate invoice"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row k="Pump" v={pumpId ? `Pump ${pumps.find((p) => p.id === pumpId)?.pump_number}` : "—"} />
            <Row k="Liters" v={litersN ? fmtLiters(litersN) : "—"} />
            <Row k="Price / L" v={fmtMoney(price, currency)} />
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-semibold font-mono tabular text-primary">{fmtMoney(total, currency)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono tabular">{v}</span>
    </div>
  );
}
