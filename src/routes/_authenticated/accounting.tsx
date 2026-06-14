import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinancialReports, listJournalEntries, postManualJournal, deleteJournalEntry, listAccounts } from "@/lib/accounting.functions";
import { getOverview } from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { Plus, Trash2, BookOpen, Receipt, Users, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/accounting")({
  head: () => ({ meta: [{ title: "Accounting — PumpOps" }] }),
  component: AccountingPage,
});

function startOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

function AccountingPage() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());

  const repFn = useServerFn(getFinancialReports);
  const jeFn = useServerFn(listJournalEntries);
  const ovFn = useServerFn(getOverview);
  const reports = useQuery({ queryKey: ["fin-reports", from, to], queryFn: () => repFn({ data: { from, to } }) });
  const journals = useQuery({ queryKey: ["journals", from, to], queryFn: () => jeFn({ data: { from, to } }) });
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => ovFn() });
  const currency = overview.data?.config?.currency ?? "USD";

  return (
    <div className="p-4 md:p-8 max-w-7xl space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Accounting</h1>
          <p className="text-sm text-muted-foreground mt-1">Full double-entry ledger, financial statements, and journal entries.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/accounts"><BookOpen className="size-4 mr-1" />Chart of Accounts</Link></Button>
          <Button asChild variant="outline"><Link to="/vendors"><Users className="size-4 mr-1" />Vendors</Link></Button>
          <Button asChild variant="outline"><Link to="/expenses"><Receipt className="size-4 mr-1" />Expenses</Link></Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3 justify-between">
            <div className="flex gap-3">
              <div className="space-y-1"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div className="space-y-1"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            <Button variant="outline" onClick={() => window.print()}><Printer className="size-4 mr-1" />Print</Button>
          </div>
        </CardContent>
      </Card>

      <KPIs data={reports.data} currency={currency} />

      <Tabs defaultValue="pnl">
        <TabsList>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="tb">Trial Balance</TabsTrigger>
          <TabsTrigger value="je">Journal Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl"><PnLReport data={reports.data} currency={currency} from={from} to={to} /></TabsContent>
        <TabsContent value="bs"><BalanceSheet data={reports.data} currency={currency} to={to} /></TabsContent>
        <TabsContent value="tb"><TrialBalance data={reports.data} currency={currency} /></TabsContent>
        <TabsContent value="je"><JournalList data={journals.data ?? []} currency={currency} /></TabsContent>
      </Tabs>
    </div>
  );
}

function KPIs({ data, currency }: { data: any; currency: string }) {
  const t = data?.totals;
  const items = [
    { l: "Revenue", v: t?.totalIncome ?? 0, c: "text-emerald-500" },
    { l: "Expenses", v: t?.totalExpense ?? 0, c: "text-rose-500" },
    { l: "Net Income", v: t?.netIncome ?? 0, c: (t?.netIncome ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500" },
    { l: "Total Assets", v: t?.totalAssets ?? 0, c: "" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((i) => (
        <Card key={i.l}>
          <CardHeader>
            <CardDescription>{i.l}</CardDescription>
            <CardTitle className={`font-mono tabular ${i.c}`}>{fmtMoney(i.v, currency)}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function PnLReport({ data, currency, from, to }: { data: any; currency: string; from: string; to: string }) {
  if (!data) return <div className="text-muted-foreground p-6">Loading…</div>;
  const income = data.pnl.filter((a: any) => a.type === "income");
  const expense = data.pnl.filter((a: any) => a.type === "expense");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit & Loss Statement</CardTitle>
        <CardDescription>{fmtDate(from)} → {fmtDate(to)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Section title="Income" rows={income} total={data.totals.totalIncome} currency={currency} />
        <Section title="Expenses" rows={expense} total={data.totals.totalExpense} currency={currency} />
        <div className="flex justify-between border-t-2 border-primary pt-3 font-semibold text-lg">
          <span>Net Income</span>
          <span className={`font-mono tabular ${data.totals.netIncome >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtMoney(data.totals.netIncome, currency)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceSheet({ data, currency, to }: { data: any; currency: string; to: string }) {
  if (!data) return <div className="text-muted-foreground p-6">Loading…</div>;
  const assets = data.balanceSheet.filter((a: any) => a.type === "asset");
  const liab = data.balanceSheet.filter((a: any) => a.type === "liability");
  const equity = data.balanceSheet.filter((a: any) => a.type === "equity");
  const liabPlusEq = data.totals.totalLiab + data.totals.totalEquity + data.totals.netIncome;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Sheet</CardTitle>
        <CardDescription>As of {fmtDate(to)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Section title="Assets" rows={assets} total={data.totals.totalAssets} currency={currency} />
        <Section title="Liabilities" rows={liab} total={data.totals.totalLiab} currency={currency} />
        <Section title="Equity" rows={equity} total={data.totals.totalEquity} currency={currency} extra={[{ name: "Current Period Net Income", amount: data.totals.netIncome }]} />
        <div className="flex justify-between border-t-2 border-primary pt-3 font-semibold">
          <span>Total Liabilities + Equity</span>
          <span className="font-mono tabular">{fmtMoney(liabPlusEq, currency)}</span>
        </div>
        {Math.abs(data.totals.totalAssets - liabPlusEq) > 0.01 && (
          <p className="text-xs text-amber-500">Note: Assets and Liab+Equity differ — opening balances may need to be entered as a manual journal against Owner's Equity (3010).</p>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, rows, total, currency, extra = [] }: { title: string; rows: any[]; total: number; currency: string; extra?: { name: string; amount: number }[] }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/30">
              <td className="py-1.5 pr-4 text-muted-foreground"><span className="font-mono tabular text-xs mr-2">{r.code}</span>{r.name}</td>
              <td className="py-1.5 text-right font-mono tabular">{fmtMoney(r.amount, currency)}</td>
            </tr>
          ))}
          {extra.map((r) => (
            <tr key={r.name} className="border-b border-border/30">
              <td className="py-1.5 pr-4 text-muted-foreground italic">{r.name}</td>
              <td className="py-1.5 text-right font-mono tabular">{fmtMoney(r.amount, currency)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2 pr-4">Total {title}</td>
            <td className="py-2 text-right font-mono tabular">{fmtMoney(total + (extra.reduce((s, e) => s + e.amount, 0)), currency)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TrialBalance({ data, currency }: { data: any; currency: string }) {
  if (!data) return <div className="text-muted-foreground p-6">Loading…</div>;
  const totalDr = data.trialBalance.reduce((s: number, r: any) => s + r.debit_balance, 0);
  const totalCr = data.trialBalance.reduce((s: number, r: any) => s + r.credit_balance, 0);
  return (
    <Card>
      <CardHeader><CardTitle>Trial Balance</CardTitle><CardDescription>Cumulative balances of every account</CardDescription></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b border-border">
            <tr><th className="py-2 pr-4">Code</th><th className="pr-4">Account</th><th className="pr-4">Type</th><th className="text-right pr-4">Debit</th><th className="text-right">Credit</th></tr>
          </thead>
          <tbody>
            {data.trialBalance.filter((a: any) => a.debit_balance > 0 || a.credit_balance > 0).map((a: any) => (
              <tr key={a.id} className="border-b border-border/50">
                <td className="py-1.5 pr-4 font-mono tabular">{a.code}</td>
                <td className="pr-4">{a.name}</td>
                <td className="pr-4 text-muted-foreground capitalize">{a.type}</td>
                <td className="pr-4 text-right font-mono tabular">{a.debit_balance ? fmtMoney(a.debit_balance, currency) : "—"}</td>
                <td className="text-right font-mono tabular">{a.credit_balance ? fmtMoney(a.credit_balance, currency) : "—"}</td>
              </tr>
            ))}
            <tr className="font-semibold border-t-2 border-primary">
              <td colSpan={3} className="py-2">Totals</td>
              <td className="text-right font-mono tabular">{fmtMoney(totalDr, currency)}</td>
              <td className="text-right font-mono tabular">{fmtMoney(totalCr, currency)}</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function JournalList({ data, currency }: { data: any[]; currency: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Journal Entries</CardTitle><CardDescription>{data.length} entries in range</CardDescription></div>
        <ManualJournalDialog />
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((j) => (
          <JournalCard key={j.id} entry={j} currency={currency} />
        ))}
        {data.length === 0 && <p className="text-center text-muted-foreground py-8"><FileText className="size-8 mx-auto mb-2 opacity-40" />No entries</p>}
      </CardContent>
    </Card>
  );
}

function JournalCard({ entry, currency }: { entry: any; currency: string }) {
  const fn = useServerFn(deleteJournalEntry);
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => fn({ data: { id: entry.id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["journals"] });
      qc.invalidateQueries({ queryKey: ["fin-reports"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="border border-border rounded-md p-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium">#{entry.entry_no} · {fmtDate(entry.entry_date)}</p>
          <p className="text-xs text-muted-foreground">{entry.memo ?? entry.reference ?? entry.source_type}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{entry.source_type}</span>
          <Button size="icon" variant="ghost" onClick={() => confirm("Delete journal entry? Account balances will be reversed.") && del.mutate()}><Trash2 className="size-4 text-destructive" /></Button>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead className="text-muted-foreground"><tr><th className="text-left">Account</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
        <tbody>
          {(entry.journal_lines ?? []).map((l: any) => (
            <tr key={l.id} className="border-t border-border/30">
              <td className="py-1"><span className="font-mono tabular mr-2">{l.accounts?.code}</span>{l.accounts?.name}</td>
              <td className="text-right font-mono tabular">{Number(l.debit) ? fmtMoney(Number(l.debit), currency) : ""}</td>
              <td className="text-right font-mono tabular">{Number(l.credit) ? fmtMoney(Number(l.credit), currency) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualJournalDialog() {
  const [open, setOpen] = useState(false);
  const accFn = useServerFn(listAccounts);
  const accs = useQuery({ queryKey: ["accounts"], queryFn: () => accFn() });
  const accounts = ((accs.data ?? []) as any[]).filter((a: any) => a.is_active);
  const [form, setForm] = useState({
    entry_date: today(),
    memo: "",
    reference: "",
    lines: [
      { account_code: "", debit: 0, credit: 0, description: "" },
      { account_code: "", debit: 0, credit: 0, description: "" },
    ],
  });
  const { totalDr, totalCr, balanced } = useMemo(() => {
    const td = form.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const tc = form.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    return { totalDr: td, totalCr: tc, balanced: Math.abs(td - tc) < 0.01 && td > 0 };
  }, [form.lines]);

  const fn = useServerFn(postManualJournal);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn({ data: { ...form, lines: form.lines.filter((l) => l.account_code && (l.debit > 0 || l.credit > 0)) } as any }),
    onSuccess: () => {
      toast.success("Journal posted");
      qc.invalidateQueries({ queryKey: ["journals"] });
      qc.invalidateQueries({ queryKey: ["fin-reports"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setOpen(false);
      setForm({ ...form, memo: "", reference: "", lines: [{ account_code: "", debit: 0, credit: 0, description: "" }, { account_code: "", debit: 0, credit: 0, description: "" }] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> Manual Entry</Button></DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
          <div className="space-y-1"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label>Memo</Label><Input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} /></div>
        </div>
        <div className="space-y-2">
          <Label>Lines</Label>
          {form.lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-2 items-center">
              <Select value={line.account_code} onValueChange={(v) => {
                const ls = [...form.lines]; ls[i] = { ...ls[i], account_code: v }; setForm({ ...form, lines: ls });
              }}>
                <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.code}>{a.code} · {a.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" step="0.01" placeholder="Debit" value={line.debit || ""} onChange={(e) => {
                const ls = [...form.lines]; ls[i] = { ...ls[i], debit: Number(e.target.value || 0), credit: 0 }; setForm({ ...form, lines: ls });
              }} />
              <Input type="number" step="0.01" placeholder="Credit" value={line.credit || ""} onChange={(e) => {
                const ls = [...form.lines]; ls[i] = { ...ls[i], credit: Number(e.target.value || 0), debit: 0 }; setForm({ ...form, lines: ls });
              }} />
              <Input placeholder="Description" value={line.description} onChange={(e) => {
                const ls = [...form.lines]; ls[i] = { ...ls[i], description: e.target.value }; setForm({ ...form, lines: ls });
              }} />
              <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })} disabled={form.lines.length <= 2}><Trash2 className="size-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setForm({ ...form, lines: [...form.lines, { account_code: "", debit: 0, credit: 0, description: "" }] })}><Plus className="size-4 mr-1" />Add line</Button>
          <div className="flex justify-end gap-6 text-sm pt-2 border-t border-border">
            <div>Total Debit: <span className="font-mono tabular font-semibold">{totalDr.toFixed(2)}</span></div>
            <div>Total Credit: <span className="font-mono tabular font-semibold">{totalCr.toFixed(2)}</span></div>
            <div className={balanced ? "text-emerald-500" : "text-amber-500"}>{balanced ? "Balanced ✓" : "Not balanced"}</div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !balanced}>{m.isPending ? "Posting…" : "Post Entry"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
