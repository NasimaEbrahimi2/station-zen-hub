
-- =====================================================================
-- ACCOUNTING LAYER (QuickBooks-style) for fuel station system
-- =====================================================================

-- ============ ACCOUNT TYPES ============
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('asset','liability','equity','income','expense');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ CHART OF ACCOUNTS ============
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type public.account_type NOT NULL,
  subtype TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_all_authenticated" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ VENDORS ============
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors_all_authenticated" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ JOURNAL ENTRIES (HEADERS) ============
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no SERIAL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  reference TEXT,
  source_type TEXT,   -- 'sale','delivery','expense','manual','refill','salary'
  source_id UUID,
  total NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "je_all_authenticated" ON public.journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ JOURNAL LINES ============
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jl_entry ON public.journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_jl_account ON public.journal_lines(account_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jl_all_authenticated" ON public.journal_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ EXPENSES (BILLS) ============
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_no SERIAL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name TEXT,
  expense_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  payment_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reference TEXT,
  memo TEXT,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_all_authenticated" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ ACCOUNT BALANCE TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _delta NUMERIC; _type public.account_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT type INTO _type FROM public.accounts WHERE id = NEW.account_id;
    IF _type IN ('asset','expense') THEN
      _delta := NEW.debit - NEW.credit;
    ELSE
      _delta := NEW.credit - NEW.debit;
    END IF;
    UPDATE public.accounts SET balance = balance + _delta, updated_at = now() WHERE id = NEW.account_id;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT type INTO _type FROM public.accounts WHERE id = OLD.account_id;
    IF _type IN ('asset','expense') THEN
      _delta := OLD.debit - OLD.credit;
    ELSE
      _delta := OLD.credit - OLD.debit;
    END IF;
    UPDATE public.accounts SET balance = balance - _delta, updated_at = now() WHERE id = OLD.account_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_jl_balance ON public.journal_lines;
CREATE TRIGGER trg_jl_balance AFTER INSERT OR DELETE ON public.journal_lines
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- ============ POSTING HELPERS ============
CREATE OR REPLACE FUNCTION public.post_journal_entry(
  _entry_date DATE, _memo TEXT, _reference TEXT, _source_type TEXT, _source_id UUID,
  _lines JSONB  -- [{account_code, debit, credit, description}]
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _entry public.journal_entries; _line JSONB; _acc UUID; _total NUMERIC := 0; _td NUMERIC := 0; _tc NUMERIC := 0;
BEGIN
  INSERT INTO public.journal_entries (entry_date, memo, reference, source_type, source_id)
  VALUES (_entry_date, _memo, _reference, _source_type, _source_id) RETURNING * INTO _entry;
  FOR _line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    SELECT id INTO _acc FROM public.accounts WHERE code = (_line->>'account_code');
    IF _acc IS NULL THEN RAISE EXCEPTION 'Account % not found', _line->>'account_code'; END IF;
    INSERT INTO public.journal_lines (entry_id, account_id, debit, credit, description)
    VALUES (_entry.id, _acc, COALESCE((_line->>'debit')::NUMERIC,0), COALESCE((_line->>'credit')::NUMERIC,0), _line->>'description');
    _td := _td + COALESCE((_line->>'debit')::NUMERIC,0);
    _tc := _tc + COALESCE((_line->>'credit')::NUMERIC,0);
  END LOOP;
  IF ROUND(_td,2) <> ROUND(_tc,2) THEN RAISE EXCEPTION 'Journal not balanced: debits=% credits=%', _td, _tc; END IF;
  UPDATE public.journal_entries SET total = _td WHERE id = _entry.id;
  RETURN _entry.id;
END $$;

-- ============ AUTO-POST: SALE ============
CREATE OR REPLACE FUNCTION public.auto_post_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _has_cash BOOLEAN; _has_rev BOOLEAN; _cogs NUMERIC; _avg_cost NUMERIC; _inv_qty NUMERIC; _inv_val NUMERIC;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.accounts WHERE code='1010') INTO _has_cash;
  SELECT EXISTS (SELECT 1 FROM public.accounts WHERE code='4010') INTO _has_rev;
  IF NOT _has_cash OR NOT _has_rev THEN RETURN NEW; END IF;
  -- Dr Cash, Cr Fuel Sales
  PERFORM public.post_journal_entry(
    NEW.created_at::DATE,
    'Sale ' || NEW.invoice_no,
    NEW.invoice_no, 'sale', NEW.id,
    jsonb_build_array(
      jsonb_build_object('account_code','1010','debit',NEW.total,'credit',0,'description','Cash from sale'),
      jsonb_build_object('account_code','4010','debit',0,'credit',NEW.total,'description','Fuel sales revenue')
    )
  );
  -- COGS using current avg cost from tank deliveries (if data available)
  SELECT COALESCE(SUM(liters),0), COALESCE(SUM(cost),0)
  INTO _inv_qty, _inv_val FROM public.tank_deliveries;
  IF _inv_qty > 0 AND EXISTS (SELECT 1 FROM public.accounts WHERE code='5010')
     AND EXISTS (SELECT 1 FROM public.accounts WHERE code='1300') THEN
    _avg_cost := _inv_val / _inv_qty;
    _cogs := ROUND(NEW.liters * _avg_cost, 2);
    IF _cogs > 0 THEN
      PERFORM public.post_journal_entry(
        NEW.created_at::DATE,
        'COGS for ' || NEW.invoice_no, NEW.invoice_no, 'sale_cogs', NEW.id,
        jsonb_build_array(
          jsonb_build_object('account_code','5010','debit',_cogs,'credit',0,'description','Cost of fuel sold'),
          jsonb_build_object('account_code','1300','debit',0,'credit',_cogs,'description','Reduce fuel inventory')
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_post_sale ON public.sales;
CREATE TRIGGER trg_auto_post_sale AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.auto_post_sale();

-- ============ AUTO-POST: DELIVERY ============
CREATE OR REPLACE FUNCTION public.auto_post_delivery()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cost IS NULL OR NEW.cost <= 0 THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE code='1300')
     OR NOT EXISTS (SELECT 1 FROM public.accounts WHERE code='1010') THEN RETURN NEW; END IF;
  PERFORM public.post_journal_entry(
    NEW.created_at::DATE,
    'Fuel delivery' || COALESCE(' from '||NEW.supplier,''),
    'DEL-'||NEW.id::TEXT, 'delivery', NEW.id,
    jsonb_build_array(
      jsonb_build_object('account_code','1300','debit',NEW.cost,'credit',0,'description','Fuel inventory in'),
      jsonb_build_object('account_code','1010','debit',0,'credit',NEW.cost,'description','Cash paid for fuel')
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_post_delivery ON public.tank_deliveries;
CREATE TRIGGER trg_auto_post_delivery AFTER INSERT ON public.tank_deliveries
FOR EACH ROW EXECUTE FUNCTION public.auto_post_delivery();

-- ============ RECORD EXPENSE (also posts journal) ============
CREATE OR REPLACE FUNCTION public.record_expense(
  _expense_date DATE, _vendor_id UUID, _vendor_name TEXT,
  _expense_account_id UUID, _payment_account_id UUID,
  _amount NUMERIC, _reference TEXT, _memo TEXT
) RETURNS public.expenses LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _exp public.expenses; _je UUID; _exp_code TEXT; _pay_code TEXT; _vname TEXT;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;
  SELECT code INTO _exp_code FROM public.accounts WHERE id = _expense_account_id;
  SELECT code INTO _pay_code FROM public.accounts WHERE id = _payment_account_id;
  IF _exp_code IS NULL OR _pay_code IS NULL THEN RAISE EXCEPTION 'Invalid account'; END IF;
  IF _vendor_id IS NOT NULL THEN
    SELECT name INTO _vname FROM public.vendors WHERE id = _vendor_id;
  END IF;
  _vname := COALESCE(_vname, _vendor_name);
  _je := public.post_journal_entry(
    _expense_date,
    'Expense' || COALESCE(' - '||_vname,''),
    COALESCE(_reference,'EXP'), 'expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_code',_exp_code,'debit',_amount,'credit',0,'description',_memo),
      jsonb_build_object('account_code',_pay_code,'debit',0,'credit',_amount,'description','Payment')
    )
  );
  INSERT INTO public.expenses (expense_date, vendor_id, vendor_name, expense_account_id, payment_account_id, amount, reference, memo, journal_entry_id)
  VALUES (_expense_date, _vendor_id, _vname, _expense_account_id, _payment_account_id, _amount, _reference, _memo, _je)
  RETURNING * INTO _exp;
  IF _vendor_id IS NOT NULL THEN
    UPDATE public.vendors SET balance = balance + _amount, updated_at = now() WHERE id = _vendor_id;
  END IF;
  RETURN _exp;
END $$;

-- ============ SEED CHART OF ACCOUNTS ============
INSERT INTO public.accounts (code, name, type, subtype, is_system) VALUES
  ('1010','Cash on Hand','asset','cash',true),
  ('1020','Bank Account','asset','bank',true),
  ('1100','Accounts Receivable','asset','receivable',true),
  ('1300','Fuel Inventory','asset','inventory',true),
  ('1310','Shop Inventory','asset','inventory',false),
  ('1500','Equipment','asset','fixed',false),
  ('2010','Accounts Payable','liability','payable',true),
  ('2100','Sales Tax Payable','liability','tax',true),
  ('2200','Wages Payable','liability','payable',false),
  ('3010','Owner''s Equity','equity','equity',true),
  ('3020','Retained Earnings','equity','equity',true),
  ('4010','Fuel Sales','income','revenue',true),
  ('4020','Shop Sales','income','revenue',false),
  ('4030','Service Income','income','revenue',false),
  ('5010','Cost of Fuel Sold','expense','cogs',true),
  ('5020','Cost of Shop Goods','expense','cogs',false),
  ('6010','Salaries & Wages','expense','operating',true),
  ('6020','Rent','expense','operating',true),
  ('6030','Utilities','expense','operating',true),
  ('6040','Maintenance & Repairs','expense','operating',true),
  ('6050','Office Supplies','expense','operating',false),
  ('6060','Insurance','expense','operating',false),
  ('6070','Fuel Transport','expense','operating',false),
  ('6080','Marketing','expense','operating',false),
  ('6090','Bank Charges','expense','operating',false),
  ('6900','Miscellaneous Expense','expense','operating',true)
ON CONFLICT (code) DO NOTHING;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_accounts_upd ON public.accounts;
CREATE TRIGGER trg_accounts_upd BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_vendors_upd ON public.vendors;
CREATE TRIGGER trg_vendors_upd BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
