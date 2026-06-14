/**
 * Accounting server functions (QuickBooks-style).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---------- Accounts (Chart of Accounts) ----------
export const listAccounts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await admin();
  const { data, error } = await supabase.from("accounts").select("*").order("code");
  if (error) throw error;
  return data ?? [];
});

const accountSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  subtype: z.string().trim().max(60).optional().default(""),
  description: z.string().trim().max(500).optional().default(""),
  is_active: z.boolean().default(true),
});

export const upsertAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => accountSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const payload: any = { ...data, subtype: data.subtype || null, description: data.description || null };
    if (data.id) {
      const { data: row, error } = await supabase.from("accounts").update(payload).eq("id", data.id).select("*").single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase.from("accounts").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase.from("accounts").delete().eq("id", data.id).eq("is_system", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Vendors ----------
export const listVendors = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await admin();
  const { data, error } = await supabase.from("vendors").select("*").order("name");
  if (error) throw error;
  return data ?? [];
});

const vendorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  contact_name: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  tax_id: z.string().trim().max(60).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  is_active: z.boolean().default(true),
});

export const upsertVendor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => vendorSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const payload: any = { ...data };
    for (const k of ["contact_name", "email", "phone", "address", "tax_id", "notes"] as const) {
      if (!payload[k]) payload[k] = null;
    }
    if (data.id) {
      const { data: row, error } = await supabase.from("vendors").update(payload).eq("id", data.id).select("*").single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase.from("vendors").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteVendor = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase.from("vendors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Expenses ----------
export const listExpenses = createServerFn({ method: "GET" })
  .inputValidator((d: { from?: string; to?: string }) => d ?? {})
  .handler(async ({ data }) => {
    const supabase = await admin();
    let q = supabase.from("expenses").select("*, vendors(name), expense_account:expense_account_id(code,name), payment_account:payment_account_id(code,name)").order("expense_date", { ascending: false }).limit(500);
    if (data.from) q = q.gte("expense_date", data.from);
    if (data.to) q = q.lte("expense_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

const expenseSchema = z.object({
  expense_date: z.string().min(1),
  vendor_id: z.string().uuid().optional().nullable(),
  vendor_name: z.string().trim().max(120).optional().default(""),
  expense_account_id: z.string().uuid(),
  payment_account_id: z.string().uuid(),
  amount: z.number().positive().max(100_000_000),
  reference: z.string().trim().max(60).optional().default(""),
  memo: z.string().trim().max(500).optional().default(""),
});

export const recordExpense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => expenseSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: row, error } = await supabase.rpc("record_expense", {
      _expense_date: data.expense_date,
      _vendor_id: data.vendor_id ?? null,
      _vendor_name: data.vendor_name || null,
      _expense_account_id: data.expense_account_id,
      _payment_account_id: data.payment_account_id,
      _amount: data.amount,
      _reference: data.reference || null,
      _memo: data.memo || null,
    } as any);
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    // get expense to find journal entry to cascade
    const { data: exp } = await supabase.from("expenses").select("*").eq("id", data.id).single();
    if (exp?.journal_entry_id) {
      await supabase.from("journal_entries").delete().eq("id", exp.journal_entry_id);
    }
    if (exp?.vendor_id) {
      await supabase.from("vendors").update({ balance: 0 } as any).eq("id", exp.vendor_id);
    }
    const { error } = await supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Journal Entries ----------
export const listJournalEntries = createServerFn({ method: "GET" })
  .inputValidator((d: { from?: string; to?: string; limit?: number }) => d ?? {})
  .handler(async ({ data }) => {
    const supabase = await admin();
    let q = supabase.from("journal_entries").select("*, journal_lines(*, accounts(code,name,type))").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(Math.min(data.limit ?? 200, 1000));
    if (data.from) q = q.gte("entry_date", data.from);
    if (data.to) q = q.lte("entry_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

const manualJournalSchema = z.object({
  entry_date: z.string().min(1),
  memo: z.string().trim().max(500).optional().default(""),
  reference: z.string().trim().max(60).optional().default(""),
  lines: z.array(z.object({
    account_code: z.string().min(1),
    debit: z.number().min(0),
    credit: z.number().min(0),
    description: z.string().max(300).optional().default(""),
  })).min(2),
});

export const postManualJournal = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => manualJournalSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: id, error } = await supabase.rpc("post_journal_entry", {
      _entry_date: data.entry_date,
      _memo: data.memo || null,
      _reference: data.reference || null,
      _source_type: "manual",
      _source_id: null,
      _lines: data.lines.map((l) => ({
        account_code: l.account_code, debit: l.debit, credit: l.credit, description: l.description,
      })),
    } as any);
    if (error) throw new Error(error.message);
    return { id };
  });

export const deleteJournalEntry = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase.from("journal_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Financial Reports ----------
export const getFinancialReports = createServerFn({ method: "GET" })
  .inputValidator((d: { from: string; to: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    const [{ data: accounts }, { data: lines }] = await Promise.all([
      supabase.from("accounts").select("*").order("code"),
      supabase.from("journal_lines")
        .select("debit, credit, account_id, journal_entries!inner(entry_date)")
        .gte("journal_entries.entry_date", data.from)
        .lte("journal_entries.entry_date", data.to),
    ]);

    // Aggregate period activity per account
    const periodMap = new Map<string, { debit: number; credit: number }>();
    (lines ?? []).forEach((l: any) => {
      const e = periodMap.get(l.account_id) ?? { debit: 0, credit: 0 };
      e.debit += Number(l.debit ?? 0);
      e.credit += Number(l.credit ?? 0);
      periodMap.set(l.account_id, e);
    });

    // Build trial balance (uses cumulative balance from accounts table)
    const trialBalance = (accounts ?? []).map((a: any) => {
      const isDebitNormal = a.type === "asset" || a.type === "expense";
      const bal = Number(a.balance ?? 0);
      return {
        ...a,
        debit_balance: isDebitNormal ? Math.max(bal, 0) : Math.max(-bal, 0),
        credit_balance: !isDebitNormal ? Math.max(bal, 0) : Math.max(-bal, 0),
      };
    });

    // P&L = income + expense activity within period
    const pnl = (accounts ?? [])
      .filter((a: any) => a.type === "income" || a.type === "expense")
      .map((a: any) => {
        const p = periodMap.get(a.id) ?? { debit: 0, credit: 0 };
        const amount = a.type === "income" ? p.credit - p.debit : p.debit - p.credit;
        return { ...a, amount };
      });
    const totalIncome = pnl.filter((a: any) => a.type === "income").reduce((s: number, a: any) => s + a.amount, 0);
    const totalExpense = pnl.filter((a: any) => a.type === "expense").reduce((s: number, a: any) => s + a.amount, 0);

    // Balance Sheet = assets/liabilities/equity at end (cumulative)
    const bs = (accounts ?? [])
      .filter((a: any) => a.type === "asset" || a.type === "liability" || a.type === "equity")
      .map((a: any) => ({ ...a, amount: Number(a.balance ?? 0) }));
    const totalAssets = bs.filter((a: any) => a.type === "asset").reduce((s: number, a: any) => s + a.amount, 0);
    const totalLiab = bs.filter((a: any) => a.type === "liability").reduce((s: number, a: any) => s + a.amount, 0);
    const totalEquity = bs.filter((a: any) => a.type === "equity").reduce((s: number, a: any) => s + a.amount, 0);
    const netIncome = totalIncome - totalExpense;

    return {
      trialBalance,
      pnl,
      balanceSheet: bs,
      totals: { totalIncome, totalExpense, netIncome, totalAssets, totalLiab, totalEquity },
    };
  });

export const getGeneralLedger = createServerFn({ method: "GET" })
  .inputValidator((d: { account_id: string; from: string; to: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: rows, error } = await supabase
      .from("journal_lines")
      .select("*, journal_entries!inner(entry_date, memo, reference, entry_no, source_type)")
      .eq("account_id", data.account_id)
      .gte("journal_entries.entry_date", data.from)
      .lte("journal_entries.entry_date", data.to)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });
