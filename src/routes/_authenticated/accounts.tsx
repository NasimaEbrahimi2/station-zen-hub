import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAccounts, upsertAccount, deleteAccount } from "@/lib/accounting.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "Chart of Accounts — PumpOps" }] }),
  component: AccountsPage,
});

const TYPES = ["asset", "liability", "equity", "income", "expense"] as const;
const TYPE_LABEL: Record<string, string> = {
  asset: "Assets", liability: "Liabilities", equity: "Equity", income: "Income", expense: "Expenses",
};

function AccountsPage() {
  const fn = useServerFn(listAccounts);
  const q = useQuery({ queryKey: ["accounts"], queryFn: () => fn() });
  const accounts = (q.data ?? []) as any[];
  const grouped = TYPES.map((t) => ({ type: t, items: accounts.filter((a) => a.type === t) }));

  return (
    <div className="p-4 md:p-8 max-w-7xl space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">All ledger accounts used in journals, sales, and reports.</p>
        </div>
        <AccountDialog />
      </div>

      {grouped.map(({ type, items }) => (
        <Card key={type}>
          <CardHeader><CardTitle>{TYPE_LABEL[type]}</CardTitle><CardDescription>{items.length} account{items.length === 1 ? "" : "s"}</CardDescription></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr><th className="py-2 pr-4">Code</th><th className="pr-4">Name</th><th className="pr-4">Subtype</th><th className="text-right pr-4">Balance</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono tabular">{a.code}</td>
                    <td className="pr-4">{a.name}{a.is_system && <span className="ml-2 text-xs text-muted-foreground">system</span>}</td>
                    <td className="pr-4 text-muted-foreground">{a.subtype ?? "—"}</td>
                    <td className="pr-4 text-right font-mono tabular">{fmtMoney(Number(a.balance ?? 0))}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <AccountDialog account={a} />
                        {!a.is_system && <DeleteAccountBtn id={a.id} />}
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={5} className="py-4 text-muted-foreground text-center">No accounts</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AccountDialog({ account }: { account?: any }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: account?.code ?? "",
    name: account?.name ?? "",
    type: account?.type ?? "expense",
    subtype: account?.subtype ?? "",
    description: account?.description ?? "",
    is_active: account?.is_active ?? true,
  });
  const fn = useServerFn(upsertAccount);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn({ data: { id: account?.id, ...form } as any }),
    onSuccess: () => { toast.success("Account saved"); qc.invalidateQueries({ queryKey: ["accounts"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {account ? <Button size="icon" variant="ghost"><Pencil className="size-4" /></Button>
          : <Button><Plus className="size-4 mr-1" /> New Account</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{account ? "Edit" : "New"} Account</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div className="space-y-1"><Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label>Subtype (optional)</Label><Input value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !form.code || !form.name}>{m.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountBtn({ id }: { id: string }) {
  const fn = useServerFn(deleteAccount);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["accounts"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return <Button size="icon" variant="ghost" onClick={() => confirm("Delete account?") && m.mutate()}><Trash2 className="size-4 text-destructive" /></Button>;
}
