/**
 * Server fns for the fuel station system.
 * Auth removed — admin client used so all routes are public.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const saleSchema = z.object({
  pump_id: z.string().uuid(),
  liters: z.number().positive().max(10000),
  customer_name: z.string().trim().max(120).optional().default(""),
  vehicle_plate: z.string().trim().max(40).optional().default(""),
});
const refillSchema = z.object({
  pump_id: z.string().uuid(),
  liters: z.number().positive().max(50000),
});
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
});

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---------- Reads ----------
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
    const limit = Math.min(data.limit ?? 25, 200);
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
  const { data } = await supabase.from("tank_deliveries")
    .select("*").order("created_at", { ascending: false }).limit(100);
  return data ?? [];
});

// ---------- Writes ----------
export const recordSale = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saleSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: row, error } = await supabase.rpc("record_sale", {
      _pump_id: data.pump_id,
      _liters: data.liters,
      _customer_name: data.customer_name,
      _vehicle_plate: data.vehicle_plate,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const recordRefill = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => refillSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: row, error } = await supabase.rpc("record_refill", {
      _pump_id: data.pump_id,
      _liters: data.liters,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const recordDelivery = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => deliverySchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: row, error } = await supabase.rpc("record_delivery", {
      _liters: data.liters,
      _cost: (data.cost ?? 0) as number,
      _supplier: data.supplier,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const updateConfig = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => configSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase.from("station_config")
      .update({ ...data, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
