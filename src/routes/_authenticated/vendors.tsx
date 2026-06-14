import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVendors, upsertVendor, deleteVendor } from "@/lib/accounting.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendors")({
  head: () => ({ meta: [{ title: "Vendors — PumpOps" }] }),
  component: VendorsPage,
});

function VendorsPage() {
  const fn = useServerFn(listVendors);
  const q = useQuery({ queryKey: ["vendors"], queryFn: () => fn() });
  const rows = (q.data ?? []) as any[];

  return (
    <div className="p-4 md:p-8 max-w-6xl space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-1">Suppliers, utility providers, and anyone you pay.</p>
        </div>
        <VendorDialog />
      </div>

      <Card>
        <CardHeader><CardTitle>All Vendors ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr><th className="py-2 pr-4">Name</th><th className="pr-4">Contact</th><th className="pr-4">Phone</th><th className="pr-4">Email</th><th className="text-right pr-4">Balance</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{v.name}</td>
                    <td className="pr-4">{v.contact_name ?? "—"}</td>
                    <td className="pr-4">{v.phone ?? "—"}</td>
                    <td className="pr-4">{v.email ?? "—"}</td>
                    <td className="pr-4 text-right font-mono tabular">{fmtMoney(Number(v.balance ?? 0))}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <VendorDialog vendor={v} />
                        <DeleteVendorBtn id={v.id} />
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No vendors yet. Add your first supplier.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VendorDialog({ vendor }: { vendor?: any }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: vendor?.name ?? "",
    contact_name: vendor?.contact_name ?? "",
    email: vendor?.email ?? "",
    phone: vendor?.phone ?? "",
    address: vendor?.address ?? "",
    tax_id: vendor?.tax_id ?? "",
    notes: vendor?.notes ?? "",
    is_active: vendor?.is_active ?? true,
  });
  const fn = useServerFn(upsertVendor);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn({ data: { id: vendor?.id, ...form } as any }),
    onSuccess: () => { toast.success("Vendor saved"); qc.invalidateQueries({ queryKey: ["vendors"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {vendor ? <Button size="icon" variant="ghost"><Pencil className="size-4" /></Button>
          : <Button><Plus className="size-4 mr-1" /> New Vendor</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{vendor ? "Edit" : "New"} Vendor</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Contact Name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Tax ID</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
          <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="col-span-2 space-y-1"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="col-span-2 space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !form.name}>{m.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteVendorBtn({ id }: { id: string }) {
  const fn = useServerFn(deleteVendor);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["vendors"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return <Button size="icon" variant="ghost" onClick={() => confirm("Delete vendor?") && m.mutate()}><Trash2 className="size-4 text-destructive" /></Button>;
}
