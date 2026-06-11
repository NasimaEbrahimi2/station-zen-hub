/**
 * Server fns for the fuel station system. Auth removed — admin client used.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const saleSchema = z.object({
  pump_id: z.string().uuid(),
  liters: z.number().positive().max(10000),
  customer_name: z.string().trim().max(120).optional().default(""),
  vehicle_plate: z.string().trim().max(40).optional().default(""),
  customer_id: z.string().uuid().optional().nullable(),
  operator_name: z.string().trim().max(120).optional().default(""),
  operator_id: z.string().uuid().optional().nullable(),
  fuel_type: z.string().trim().max(40).optional().default(""),
});
const refillSchema = z.object({ pump_id: z.string().uuid(), liters: z.number().positive().max(50000) });
const deliverySchema = z.object({
  liters: z.number().positive().max(500000),
  cost: z.number().min(0).max(10_000_000).optional().nullable(),
  supplier: z.string().trim().max(120).optional().default(""),
});
const configSchema = z.object({
  fuel_price: z.number().positive().max(10000),
  tank_capacity: z.number().positive().max(10_000_000),
  station_name: z.string().trim().min(1).max(120),
  currency: z.string().trim().min(1).max(8),
  low_threshold: z.number().min(0).max(100000),
  auto_refill: z.boolean(),
  iranian_pct: z.number().min(0).max(100),
  russian_pct: z.number().min(0).max(100),
  arabic_pct: z.number().min(0).max(100),
  fuel_type: z.string().trim().min(1).max(40),
});

const customerSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(1).max(120),
  full_name_fa: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  vehicle_plate: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
});

const employeeSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(1).max(120),
  full_name_fa: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  position: z.string().trim().max(80).optional().default(""),
  schedule: z.string().trim().max(120).optional().default(""),
  salary: z.number().min(0).max(10_000_000).default(0),
  check_in: z.string().trim().max(8).optional().default(""),
  check_out: z.string().trim().max(8).optional().default(""),
  salary_pay_day: z.number().int().min(1).max(31).optional().nullable(),
  hired_at: z.string().trim().max(40).optional().default(""),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().trim().max(500).optional().default(""),
});

const attendanceSchema = z.object({
  employee_id: z.string().uuid(),
  work_date: z.string().min(1),
  check_in: z.string().optional().nullable(),
  check_out: z.string().optional().nullable(),
  notes: z.string().trim().max(300).optional().default(""),
});

const salarySchema = z.object({
  employee_id: z.string().uuid(),
  amount: z.number().min(0).max(10_000_000),
  pay_date: z.string().min(1),
  period: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(300).optional().default(""),
});

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---------- Overview / Sales ----------
export const getOverview = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await admin();
  const [cfg, tank, pumps] = await Promise.all([
    supabase.from("station_config").select("*").eq("id", 1).single(),
    supabase.from("tank").select("*").eq("id", 1).single(),
    supabase.from("pumps").select("*").order("pump_number"),
  ]);
  return {
    config: cfg.data,
    tank: tank.data,
    pumps: pumps.data ?? [],
    roles: ["admin"],
    userId: null as string | null,
  };
});

export const getRecentSales = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number }) => d ?? {})
  .handler(async ({ data }) => {
    const supabase = await admin();
    const limit = Math.min(data.limit ?? 25, 500);
    const { data: rows, error } = await supabase
      .from("sales").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return rows ?? [];
  });

export const getSalesInRange = createServerFn({ method: "GET" })
  .inputValidator((d: { from: string; to: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: rows, error } = await supabase
      .from("sales").select("*")
      .gte("created_at", data.from).lte("created_at", data.to)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const getSale = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    const [{ data: sale }, { data: cfg }] = await Promise.all([
      supabase.from("sales").select("*").eq("id", data.id).single(),
      supabase.from("station_config").select("*").eq("id", 1).single(),
    ]);
    return { sale, config: cfg };
  });

export const getRefills = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await admin();
  const { data } = await supabase.from("refills")
    .select("*, pumps(pump_number)")
    .order("created_at", { ascending: false }).limit(100);
  return data ?? [];
});

export const getDeliveries = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await admin();
  const { data } = await supabase.from("tank_deliveries").select("*").order("created_at", { ascending: false }).limit(200);
  return data ?? [];
});

// ---------- Writes: sale / refill / delivery / config ----------
export const recordSale = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saleSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: row, error } = await supabase.rpc("record_sale", {
      _pump_id: data.pump_id,
      _liters: data.liters,
      _customer_name: data.customer_name,
      _vehicle_plate: data.vehicle_plate,
      _customer_id: data.customer_id ?? null,
      _operator_name: data.operator_name,
      _operator_id: data.operator_id ?? null,
      _fuel_type: data.fuel_type,
    } as any);
    if (error) throw new Error(error.message);
    return row;
  });

export const recordRefill = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => refillSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: row, error } = await supabase.rpc("record_refill", { _pump_id: data.pump_id, _liters: data.liters });
    if (error) throw new Error(error.message);
    return row;
  });

export const refillPumpToFull = createServerFn({ method: "POST" })
  .inputValidator((d: { pump_id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: row, error } = await supabase.rpc("refill_pump_to_full" as any, { _pump_id: data.pump_id });
    if (error) throw new Error(error.message);
    return row;
  });

export const recordDelivery = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => deliverySchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: row, error } = await supabase.rpc("record_delivery", {
      _liters: data.liters, _cost: (data.cost ?? 0) as number, _supplier: data.supplier,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const updateConfig = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => configSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase.from("station_config")
      .update({ ...data, updated_at: new Date().toISOString() } as any).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Customers ----------
export const listCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await admin();
  const { data, error } = await (supabase as any).from("customers").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const upsertCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => customerSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const payload: any = { ...data, updated_at: new Date().toISOString() };
    if (data.id) {
      const { error } = await (supabase as any).from("customers").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      delete payload.id;
      const { error } = await (supabase as any).from("customers").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await (supabase as any).from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Employees ----------
export const listEmployees = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await admin();
  const { data, error } = await (supabase as any).from("employees").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const upsertEmployee = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => employeeSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const payload: any = {
      ...data,
      check_in: data.check_in || null,
      check_out: data.check_out || null,
      hired_at: data.hired_at || null,
      salary_pay_day: data.salary_pay_day || null,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await (supabase as any).from("employees").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      delete payload.id;
      const { error } = await (supabase as any).from("employees").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await (supabase as any).from("employees").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Attendance ----------
export const listAttendance = createServerFn({ method: "GET" })
  .inputValidator((d: { employee_id?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const supabase = await admin();
    let q = (supabase as any).from("attendance").select("*, employees(full_name)").order("work_date", { ascending: false }).limit(500);
    if (data.employee_id) q = q.eq("employee_id", data.employee_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const recordAttendance = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => attendanceSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const payload: any = {
      employee_id: data.employee_id,
      work_date: data.work_date,
      check_in: data.check_in || null,
      check_out: data.check_out || null,
      notes: data.notes || null,
    };
    const { error } = await (supabase as any).from("attendance").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Salary payments ----------
export const listSalaries = createServerFn({ method: "GET" })
  .inputValidator((d: { employee_id?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const supabase = await admin();
    let q = (supabase as any).from("salary_payments").select("*, employees(full_name)").order("pay_date", { ascending: false }).limit(500);
    if (data.employee_id) q = q.eq("employee_id", data.employee_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const recordSalary = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => salarySchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await (supabase as any).from("salary_payments").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
