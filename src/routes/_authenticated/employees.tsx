import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  deleteEmployee, listAttendance, listEmployees, listSalaries,
  recordAttendance, recordSalary, upsertEmployee,
} from "@/lib/station.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fmtDate, fmtDateTime, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employees — PumpOps" }] }),
  component: EmployeesPage,
});

const blank = {
  id: "", full_name: "", full_name_fa: "", phone: "", email: "", position: "",
  schedule: "", salary: 0, check_in: "", check_out: "", salary_pay_day: 1,
  hired_at: "", status: "active", notes: "",
};

function EmployeesPage() {
  const qc = useQueryClient();
  const empFn = useServerFn(listEmployees);
  const upFn = useServerFn(upsertEmployee);
  const delFn = useServerFn(deleteEmployee);
  const attFn = useServerFn(listAttendance);
  const recAttFn = useServerFn(recordAttendance);
  const salFn = useServerFn(listSalaries);
  const recSalFn = useServerFn(recordSalary);

  const employees = useQuery({ queryKey: ["employees"], queryFn: () => empFn() });
  const attendance = useQuery({ queryKey: ["attendance"], queryFn: () => attFn() });
  const salaries = useQuery({ queryKey: ["salaries"], queryFn: () => salFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    const items = (employees.data ?? []) as any[];
    return items.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return e.full_name?.toLowerCase().includes(s) || e.position?.toLowerCase().includes(s) || e.phone?.toLowerCase().includes(s);
    });
  }, [employees.data, q, statusFilter]);

  const save = useMutation({
    mutationFn: (d: any) => upFn({ data: d }),
    onSuccess: () => { toast.success("Employee saved"); setOpen(false); setForm(blank); qc.invalidateQueries({ queryKey: ["employees"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["employees"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // attendance form
  const [attForm, setAttForm] = useState({ employee_id: "", work_date: new Date().toISOString().slice(0, 10), check_in: "", check_out: "", notes: "" });
  const recAtt = useMutation({
    mutationFn: (d: any) => recAttFn({ data: d }),
    onSuccess: () => { toast.success("Attendance recorded"); setAttForm({ ...attForm, check_in: "", check_out: "", notes: "" }); qc.invalidateQueries({ queryKey: ["attendance"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // salary form
  const [salForm, setSalForm] = useState({ employee_id: "", amount: 0, pay_date: new Date().toISOString().slice(0, 10), period: "", notes: "" });
  const recSal = useMutation({
    mutationFn: (d: any) => recSalFn({ data: d }),
    onSuccess: () => { toast.success("Salary payment recorded"); setSalForm({ ...salForm, amount: 0, period: "", notes: "" }); qc.invalidateQueries({ queryKey: ["salaries"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Employees <span className="text-muted-foreground text-lg" dir="rtl">/ کارمندان</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Directory, attendance, and salary payments.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(blank); }}>
          <DialogTrigger asChild><Button onClick={() => setForm(blank)}><Plus className="size-4 mr-1" /> Add employee</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{form.id ? "Edit employee" : "New employee"}</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate({ ...form, id: form.id || undefined, salary: Number(form.salary), salary_pay_day: Number(form.salary_pay_day) || null }); }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Full name (English)</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Full name (نام فارسی)</Label><Input dir="rtl" value={form.full_name_fa} onChange={(e) => setForm({ ...form, full_name_fa: e.target.value })} /></div>
                <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1"><Label>Job position</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
                <div className="space-y-1"><Label>Working schedule</Label><Input placeholder="e.g. Mon–Fri 8–17" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} /></div>
                <div className="space-y-1"><Label>Salary</Label><Input type="number" min="0" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
                <div className="space-y-1"><Label>Salary pay day (1–31)</Label><Input type="number" min="1" max="31" value={form.salary_pay_day} onChange={(e) => setForm({ ...form, salary_pay_day: e.target.value })} /></div>
                <div className="space-y-1"><Label>Check-in time</Label><Input type="time" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} /></div>
                <div className="space-y-1"><Label>Check-out time</Label><Input type="time" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} /></div>
                <div className="space-y-1"><Label>Employment start date</Label><Input type="date" value={form.hired_at} onChange={(e) => setForm({ ...form, hired_at: e.target.value })} /></div>
                <div className="space-y-1"><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="salaries">Salary payments</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2"><UserCog className="size-5 text-primary" /> {filtered.length} employees</CardTitle>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input className="max-w-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b border-border">
                    <tr><th className="py-2 pr-4">Name</th><th className="pr-4">Position</th><th className="pr-4">Schedule</th><th className="pr-4">Salary</th><th className="pr-4">Hired</th><th className="pr-4">Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((e: any) => (
                      <tr key={e.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">
                          <p className="font-medium">{e.full_name}</p>
                          {e.full_name_fa && <p className="text-xs text-muted-foreground" dir="rtl">{e.full_name_fa}</p>}
                          <p className="text-xs text-muted-foreground font-mono">{e.phone || ""}</p>
                        </td>
                        <td className="pr-4">{e.position || "—"}</td>
                        <td className="pr-4 text-xs">{e.schedule || "—"}<br />{e.check_in && e.check_out ? `${e.check_in}–${e.check_out}` : ""}</td>
                        <td className="pr-4 font-mono tabular">{fmtMoney(Number(e.salary || 0))}</td>
                        <td className="pr-4">{e.hired_at ? fmtDate(e.hired_at) : "—"}</td>
                        <td className="pr-4"><Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge></td>
                        <td className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => { setForm({ ...e, salary: e.salary ?? 0, salary_pay_day: e.salary_pay_day ?? 1 }); setOpen(true); }}><Pencil className="size-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete employee?")) del.mutate(e.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No employees yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Record attendance</CardTitle><CardDescription>Daily check-in / check-out.</CardDescription></CardHeader>
            <CardContent>
              <form className="grid sm:grid-cols-5 gap-3" onSubmit={(e) => { e.preventDefault(); if (!attForm.employee_id) return toast.error("Pick employee"); recAtt.mutate({ ...attForm, check_in: attForm.check_in ? `${attForm.work_date}T${attForm.check_in}` : null, check_out: attForm.check_out ? `${attForm.work_date}T${attForm.check_out}` : null }); }}>
                <div className="space-y-1"><Label>Employee</Label>
                  <Select value={attForm.employee_id} onValueChange={(v) => setAttForm({ ...attForm, employee_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{(employees.data ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Date</Label><Input type="date" value={attForm.work_date} onChange={(e) => setAttForm({ ...attForm, work_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Check-in</Label><Input type="time" value={attForm.check_in} onChange={(e) => setAttForm({ ...attForm, check_in: e.target.value })} /></div>
                <div className="space-y-1"><Label>Check-out</Label><Input type="time" value={attForm.check_out} onChange={(e) => setAttForm({ ...attForm, check_out: e.target.value })} /></div>
                <div className="space-y-1"><Label>&nbsp;</Label><Button type="submit" className="w-full" disabled={recAtt.isPending}>Record</Button></div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Attendance history</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b border-border">
                    <tr><th className="py-2 pr-4">Date</th><th className="pr-4">Employee</th><th className="pr-4">Check-in</th><th className="pr-4">Check-out</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {(attendance.data ?? []).map((a: any) => (
                      <tr key={a.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">{fmtDate(a.work_date)}</td>
                        <td className="pr-4">{a.employees?.full_name ?? "—"}</td>
                        <td className="pr-4 font-mono tabular">{a.check_in ? fmtDateTime(a.check_in) : "—"}</td>
                        <td className="pr-4 font-mono tabular">{a.check_out ? fmtDateTime(a.check_out) : "—"}</td>
                        <td>{a.notes || ""}</td>
                      </tr>
                    ))}
                    {(attendance.data ?? []).length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No records yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salaries" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Pay salary</CardTitle></CardHeader>
            <CardContent>
              <form className="grid sm:grid-cols-5 gap-3" onSubmit={(e) => { e.preventDefault(); if (!salForm.employee_id) return toast.error("Pick employee"); recSal.mutate({ ...salForm, amount: Number(salForm.amount) }); }}>
                <div className="space-y-1"><Label>Employee</Label>
                  <Select value={salForm.employee_id} onValueChange={(v) => { const emp: any = (employees.data ?? []).find((x: any) => x.id === v); setSalForm({ ...salForm, employee_id: v, amount: emp?.salary ?? 0 }); }}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{(employees.data ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Amount</Label><Input type="number" min="0" step="0.01" value={salForm.amount} onChange={(e) => setSalForm({ ...salForm, amount: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Pay date</Label><Input type="date" value={salForm.pay_date} onChange={(e) => setSalForm({ ...salForm, pay_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Period (e.g. 2026-06)</Label><Input value={salForm.period} onChange={(e) => setSalForm({ ...salForm, period: e.target.value })} /></div>
                <div className="space-y-1"><Label>&nbsp;</Label><Button type="submit" className="w-full" disabled={recSal.isPending}>Pay</Button></div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Payment history</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b border-border">
                    <tr><th className="py-2 pr-4">Date</th><th className="pr-4">Employee</th><th className="pr-4">Period</th><th className="pr-4">Amount</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {(salaries.data ?? []).map((s: any) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">{fmtDate(s.pay_date)}</td>
                        <td className="pr-4">{s.employees?.full_name ?? "—"}</td>
                        <td className="pr-4">{s.period || "—"}</td>
                        <td className="pr-4 font-mono tabular">{fmtMoney(Number(s.amount))}</td>
                        <td>{s.notes || ""}</td>
                      </tr>
                    ))}
                    {(salaries.data ?? []).length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No payments yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
