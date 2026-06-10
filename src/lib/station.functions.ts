/**
 * Server fns for the fuel station system.
 * Client-safe path: routes/components import these via useServerFn.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Schemas ----------
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

// ---------- Reads ----------
export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [cfg, tank, pumps, roles] = await Promise.all([
      supabase.from("station_config").select("*").eq("id", 1).single(),
      supabase.from("tank").select("*").eq("id", 1).single(),
      supabase.from("pumps").select("*").order("pump_number"),
      supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    return {
      config: cfg.data,
      tank: tank.data,
      pumps: pumps.data ?? [],
      roles: (roles.data ?? []).map((r) => r.role),
      userId: context.userId,
    };
  });

export const getRecentSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => d ?? {})
  .handler(async ({ data, context }) => {
    const limit = Math.min(data.limit ?? 25, 200);
    const { data: rows, error } = await context.supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return rows ?? [];
  });

export const getSalesInRange = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("sales")
      .select("*")
      .gte("created_at", data.from)
      .lte("created_at", data.to)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const getSale = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const [{ data: sale }, { data: cfg }] = await Promise.all([
      context.supabase.from("sales").select("*").eq("id", data.id).single(),
      context.supabase.from("station_config").select("*").eq("id", 1).single(),
    ]);
    return { sale, config: cfg };
  });

export const getRefills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("refills")
      .select("*, pumps(pump_number)")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const getDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("tank_deliveries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

// ---------- Writes ----------
export const recordSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("record_sale", {
      _pump_id: data.pump_id,
      _liters: data.liters,
      _customer_name: data.customer_name,
      _vehicle_plate: data.vehicle_plate,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const recordRefill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => refillSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("record_refill", {
      _pump_id: data.pump_id,
      _liters: data.liters,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const recordDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deliverySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("record_delivery", {
      _liters: data.liters,
      _cost: (data.cost ?? 0) as number,
      _supplier: data.supplier,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const updateConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => configSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("station_config")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
