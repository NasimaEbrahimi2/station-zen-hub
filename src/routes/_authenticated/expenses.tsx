import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listExpenses, recordExpense, deleteExpense, listAccounts, listVendors } from "@/lib/accounting.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { Plus, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — PumpOps" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const listFn = useServerFn(listExpenses);
  const q = useQuery({ queryKey: ["expenses"], queryFn: () => listFn({ data: {} }) });
  const rows = (q.data ?? []) as any[];
  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount ?? 0), 0), [rows]);

  return (
    <div className="p-4 md:p-8 max-w-7xl space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Bills, payments, and operating costs. Auto-posted to the ledger.</p>
        </div>
        <ExpenseDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardDescription>Total Expenses (shown)</CardDescription><CardTitle className="font-mono tabular">{fmtMoney(total)}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Entries</CardDescription><CardTitle>{rows.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Avg</CardDescription><CardTitle className="font-mono tabular">{rows.length ? fmtMoney(total / rows.length) : "—"}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Expenses</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr><th className="py-2 pr-4">Date</th><th className="pr-4">#</th><th className="pr-4">Vendor</th><th className="pr-4">Category</th><th className="pr-4">Paid From</th><th className="pr-4">Reference</th><th className="text-right pr-4">Amount</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-2 pr-4">{fmtDate(r.expense_date)}</td>
                    <td className="pr-4 font-mono tabular">{r.expense_no}</td>
                    <td className="pr-4">{r.vendor_name ?? r.vendors?.name ?? "—"}</td>
                    <td className="pr-4">{r.expense_account?.code} · {r.expense_account?.name}</td>
                    <td className="pr-4">{r.payment_account?.code} · {r.payment_account?.name}</td>
                    <td className="pr-4">{r.reference ?? "—"}</td>
                    <td className="pr-4 text-right font-mono tabular">{fmtMoney(Number(r.amount))}</td>
                    <td className="text-right"><DeleteBtn id={r.id} /></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground"><Receipt className="size-8 mx-auto mb-2 opacity-40" />No expenses yet</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpenseDialog() {
  const [open, setOpen] = useState(false);
  const accFn = useServerFn(listAccounts);
  const vFn = useServerFn(listVendors);
  const accs = useQuery({ queryKey: ["accounts"], queryFn: () => accFn() });
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: () => vFn() });
  const accounts = (accs.data ?? []) as any[];
  const expenseAccs = accounts.filter((a) => a.type === "expense" && a.is_active);
  const payAccs = accounts.filter((a) => (a.type === "asset" && (a.subtype === "cash" || a.subtype === "bank")) || a.code === "1010" || a.code === "1020");

  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    vendor_id: "",
    vendor_name: "",
    expense_account_id: "",
    payment_account_id: "",
    amount: "",
    reference: "",
    memo: "",
  });

  const fn = useServerFn(recordExpense);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn({ data: {
      expense_date: form.expense_date,
      vendor_id: form.vendor_id || null,
      vendor_name: form.vendor_name,
      expense_account_id: form.expense_account_id,
      payment_account_id: form.payment_account_id,
      amount: Number(form.amount),
      reference: form.reference,
      memo: form.memo,
    } as any }),
    onSuccess: () => {
      toast.success("Expense recorded");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["vendors"] });
      qc.invalidateQueries({ queryKey: ["fin-reports"] });
      setOpen(false);
      setForm({ ...form, amount: "", reference: "", memo: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const ready = form.expense_account_id && form.payment_account_id && Number(form.amount) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> New Expense</Button></DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
          <div className="space-y-1"><Label>Amount *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label>Vendor</Label>
            <Select value={form.vendor_id || "__none"} onValueChange={(v) => setForm({ ...form, vendor_id: v === "__none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Choose a vendor or leave blank" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— None / Walk-in —</SelectItem>
                {(vendors.data ?? []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!form.vendor_id && (
            <div className="space-y-1 col-span-2"><Label>Vendor name (optional)</Label><Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} /></div>
          )}
          <div className="space-y-1"><Label>Expense Category *</Label>
            <Select value={form.expense_account_id} onValueChange={(v) => setForm({ ...form, expense_account_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {expenseAccs.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Paid From *</Label>
            <Select value={form.payment_account_id} onValueChange={(v) => setForm({ ...form, payment_account_id: v })}>
              <SelectTrigger><SelectValue placeholder="Cash / Bank" /></SelectTrigger>
              <SelectContent>
                {payAccs.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2"><Label>Reference / Bill #</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label>Memo</Label><Textarea value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !ready}>{m.isPending ? "Saving…" : "Record Expense"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBtn({ id }: { id: string }) {
  const fn = useServerFn(deleteExpense);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return <Button size="icon" variant="ghost" onClick={() => confirm("Delete this expense and reverse its ledger entry?") && m.mutate()}><Trash2 className="size-4 text-destructive" /></Button>;
}
