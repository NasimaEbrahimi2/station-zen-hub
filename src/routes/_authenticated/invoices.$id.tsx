import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSale } from "@/lib/station.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Printer, Fuel } from "lucide-react";
import { fmtDateTime, fmtLiters, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  head: () => ({ meta: [{ title: "Invoice — PumpOps" }] }),
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getSale);
  const q = useQuery({ queryKey: ["sale", id], queryFn: () => fn({ data: { id } }) });

  if (q.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!q.data?.sale) return <div className="p-8">Not found</div>;

  const s: any = q.data.sale;
  const cfg: any = q.data.config;
  const currency = cfg?.currency ?? "USD";

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-4">
      <div className="flex items-center justify-between no-print">
        <Link to="/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All invoices
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="size-4 mr-2" /> Print / Save PDF
        </Button>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-8 md:p-10">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-md bg-primary grid place-items-center">
                <Fuel className="size-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xl font-semibold">{cfg?.station_name ?? "Fuel Station"}</p>
                <p className="text-xs text-muted-foreground">Fuel sale receipt</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Invoice</p>
              <p className="font-mono tabular text-lg">{s.invoice_no}</p>
              <p className="text-xs text-muted-foreground mt-1">{fmtDateTime(s.created_at)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Customer</p>
              <p className="font-medium">{s.customer_name ?? "Walk-in"}</p>
              {s.vehicle_plate && <p className="text-muted-foreground text-xs mt-0.5">Plate: {s.vehicle_plate}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Pump</p>
              <p className="font-medium">Pump {s.pump_number}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-8">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Price / L</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3">Fuel dispensed (Pump {s.pump_number})</td>
                <td className="text-right font-mono tabular">{fmtLiters(Number(s.liters))}</td>
                <td className="text-right font-mono tabular">{fmtMoney(Number(s.price_per_liter), currency)}</td>
                <td className="text-right font-mono tabular">{fmtMoney(Number(s.total), currency)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono tabular">{fmtMoney(Number(s.total), currency)}</span></div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-semibold font-mono tabular text-primary">{fmtMoney(Number(s.total), currency)}</span>
              </div>
            </div>
          </div>

          <p className="mt-10 text-xs text-center text-muted-foreground">
            Thank you for your business. · Pump {s.pump_number} reading: {fmtLiters(Number(s.pump_before))} → {fmtLiters(Number(s.pump_after))}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
