import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverview, updateConfig } from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

function LanguageToggle() {
  const { lang } = useI18n();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">
        {lang === "fa" ? "زبان فعلی: فارسی (دری)" : "Current language: English"}
      </div>
      <LanguageSwitcher />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — PumpOps" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getOverview);
  const updateFn = useServerFn(updateConfig);
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => overviewFn() });
  const cfg: any = overview.data?.config;

  const [form, setForm] = useState({
    fuel_price: 0,
    tank_capacity: 0,
    station_name: "",
    currency: "USD",
    low_threshold: 10,
    auto_refill: false,
    iranian_pct: 34,
    russian_pct: 33,
    arabic_pct: 33,
    fuel_type: "Diesel",
  });

  useEffect(() => {
    if (cfg) setForm({
      fuel_price: Number(cfg.fuel_price),
      tank_capacity: Number(cfg.tank_capacity),
      station_name: cfg.station_name,
      currency: cfg.currency,
      low_threshold: Number(cfg.low_threshold ?? 10),
      auto_refill: Boolean(cfg.auto_refill),
      iranian_pct: Number(cfg.iranian_pct ?? 34),
      russian_pct: Number(cfg.russian_pct ?? 33),
      arabic_pct: Number(cfg.arabic_pct ?? 33),
      fuel_type: cfg.fuel_type ?? "Diesel",
    });
  }, [cfg]);

  const totalPct = form.iranian_pct + form.russian_pct + form.arabic_pct;

  const m = useMutation({
    mutationFn: (d: typeof form) => updateFn({ data: d }),
    onSuccess: () => { toast.success("Settings saved / تنظیمات ذخیره شد"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Math.abs(totalPct - 100) > 0.01) {
      return toast.error(`Fuel origin percentages must sum to 100% (currently ${totalPct}%)`);
    }
    m.mutate(form);
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Settings <span className="text-muted-foreground text-lg" dir="rtl">/ تنظیمات</span></h1>
        <p className="text-sm text-muted-foreground mt-1">Station configuration, refill rules, and fuel origin blend.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Language / زبان</CardTitle>
          <CardDescription>Switch the interface between English and Persian (Dari). / تغییر زبان رابط کاربری بین انگلیسی و فارسی (دری).</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageToggle />
        </CardContent>
      </Card>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Station</CardTitle><CardDescription>Used on invoices and reports.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Station name / نام جایگاه</Label>
              <Input value={form.station_name} onChange={(e) => setForm({ ...form, station_name: e.target.value })} /></div>
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
              <div className="space-y-2"><Label>Fuel price / L</Label>
                <Input type="number" min="0" step="0.001" value={form.fuel_price} onChange={(e) => setForm({ ...form, fuel_price: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Tank capacity (L)</Label>
                <Input type="number" min="0" step="1" value={form.tank_capacity} onChange={(e) => setForm({ ...form, tank_capacity: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Default fuel type</Label>
                <Input value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pump refill rules <span className="text-muted-foreground text-sm" dir="rtl">/ قوانین سوخت‌گیری</span></CardTitle>
            <CardDescription>Refill pumps when fuel reaches the low threshold (e.g. 10 L) or empties.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Low-fuel threshold (L)</Label>
                <Input type="number" min="0" step="0.1" value={form.low_threshold}
                  onChange={(e) => setForm({ ...form, low_threshold: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">Pumps below this volume will be flagged with a "Refill" button.</p>
              </div>
              <div className="space-y-2">
                <Label>Auto-refill on low fuel</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch checked={form.auto_refill} onCheckedChange={(v) => setForm({ ...form, auto_refill: v })} />
                  <span className="text-sm text-muted-foreground">
                    {form.auto_refill ? "Top up automatically from tank after each sale below threshold" : "Manual refill only"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fuel origin blend <span className="text-muted-foreground text-sm" dir="rtl">/ ترکیب سوخت</span></CardTitle>
            <CardDescription>Percentage breakdown shown on the tank and each pump. Must total 100%.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <PctInput label="Iranian / ایرانی" value={form.iranian_pct}
                onChange={(v) => setForm({ ...form, iranian_pct: v })} color="bg-emerald-500" />
              <PctInput label="Russian / روسی" value={form.russian_pct}
                onChange={(v) => setForm({ ...form, russian_pct: v })} color="bg-sky-500" />
              <PctInput label="Arabic / عربی" value={form.arabic_pct}
                onChange={(v) => setForm({ ...form, arabic_pct: v })} color="bg-amber-500" />
            </div>
            <div className="flex h-3 rounded-md overflow-hidden border border-border">
              <div className="bg-emerald-500" style={{ width: `${form.iranian_pct}%` }} />
              <div className="bg-sky-500" style={{ width: `${form.russian_pct}%` }} />
              <div className="bg-amber-500" style={{ width: `${form.arabic_pct}%` }} />
            </div>
            <p className={`text-sm ${Math.abs(totalPct - 100) > 0.01 ? "text-destructive" : "text-muted-foreground"}`}>
              Total: {totalPct}% {Math.abs(totalPct - 100) > 0.01 && "— must equal 100%"}
            </p>
          </CardContent>
        </Card>

        <Button type="submit" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save settings / ذخیره"}</Button>
      </form>
    </div>
  );
}

function PctInput({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2"><span className={`size-3 rounded-sm ${color}`} />{label}</Label>
      <Input type="number" min="0" max="100" step="1" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
