import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteCustomer, listCustomers, upsertCustomer } from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — PumpOps" }] }),
  component: CustomersPage,
});

const blank = { id: "", full_name: "", full_name_fa: "", phone: "", email: "", vehicle_plate: "", notes: "" };

function CustomersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCustomers);
  const upsertFn = useServerFn(upsertCustomer);
  const delFn = useServerFn(deleteCustomer);
  const list = useQuery({ queryKey: ["customers"], queryFn: () => listFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const items = (list.data ?? []) as any[];
    if (!q.trim()) return items;
    const s = q.toLowerCase();
    return items.filter((c) =>
      c.full_name?.toLowerCase().includes(s) ||
      c.full_name_fa?.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s) ||
      c.vehicle_plate?.toLowerCase().includes(s));
  }, [list.data, q]);

  const save = useMutation({
    mutationFn: (d: any) => upsertFn({ data: d }),
    onSuccess: () => { toast.success("Customer saved"); setOpen(false); setForm(blank); qc.invalidateQueries({ queryKey: ["customers"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["customers"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Customers <span className="text-muted-foreground text-lg" dir="rtl">/ مشتریان</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Customer directory used on invoices.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(blank); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(blank)}><Plus className="size-4 mr-1" /> Add customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate({ ...form, id: form.id || undefined }); }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Full name (English)</Label>
                  <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Full name (نام فارسی)</Label>
                  <Input dir="rtl" value={form.full_name_fa} onChange={(e) => setForm({ ...form, full_name_fa: e.target.value })} /></div>
                <div className="space-y-1"><Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1"><Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1"><Label>Vehicle plate</Label>
                  <Input value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" /> {filtered.length} customers</CardTitle>
            <Input className="max-w-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr><th className="py-2 pr-4">Name</th><th className="pr-4">نام فارسی</th><th className="pr-4">Phone</th><th className="pr-4">Plate</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{c.full_name}</td>
                    <td className="pr-4" dir="rtl">{c.full_name_fa || "—"}</td>
                    <td className="pr-4 font-mono tabular">{c.phone || "—"}</td>
                    <td className="pr-4">{c.vehicle_plate || "—"}</td>
                    <td className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setForm(c); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete customer?")) del.mutate(c.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No customers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
