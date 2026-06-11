
-- 1. Extend station_config
ALTER TABLE public.station_config
  ADD COLUMN IF NOT EXISTS low_threshold NUMERIC NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS auto_refill BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iranian_pct NUMERIC NOT NULL DEFAULT 34,
  ADD COLUMN IF NOT EXISTS russian_pct NUMERIC NOT NULL DEFAULT 33,
  ADD COLUMN IF NOT EXISTS arabic_pct  NUMERIC NOT NULL DEFAULT 33,
  ADD COLUMN IF NOT EXISTS fuel_type   TEXT   NOT NULL DEFAULT 'Diesel';

-- 2. Extend sales
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS customer_id   UUID,
  ADD COLUMN IF NOT EXISTS operator_name TEXT,
  ADD COLUMN IF NOT EXISTS operator_id   UUID,
  ADD COLUMN IF NOT EXISTS fuel_type     TEXT;

-- 3. Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  full_name_fa TEXT,
  phone TEXT,
  email TEXT,
  vehicle_plate TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated, anon;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "public write customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- 4. Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  full_name_fa TEXT,
  phone TEXT,
  email TEXT,
  position TEXT,
  schedule TEXT,
  salary NUMERIC NOT NULL DEFAULT 0,
  check_in TIME,
  check_out TIME,
  salary_pay_day INT,
  hired_at DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated, anon;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "public write employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- 5. Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated, anon;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "public write attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

-- 6. Salary payments
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  pay_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_payments TO authenticated, anon;
GRANT ALL ON public.salary_payments TO service_role;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read salaries" ON public.salary_payments FOR SELECT USING (true);
CREATE POLICY "public write salaries" ON public.salary_payments FOR ALL USING (true) WITH CHECK (true);

-- 7. Update record_sale to capture customer/operator/fuel_type
CREATE OR REPLACE FUNCTION public.record_sale(
  _pump_id UUID, _liters NUMERIC, _customer_name TEXT, _vehicle_plate TEXT,
  _customer_id UUID DEFAULT NULL, _operator_name TEXT DEFAULT NULL,
  _operator_id UUID DEFAULT NULL, _fuel_type TEXT DEFAULT NULL
) RETURNS public.sales
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _pump public.pumps; _cfg public.station_config; _total NUMERIC; _sale public.sales;
BEGIN
  IF _liters <= 0 THEN RAISE EXCEPTION 'Liters must be > 0'; END IF;
  SELECT * INTO _pump FROM public.pumps WHERE id = _pump_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pump not found'; END IF;
  IF _pump.current_volume < _liters THEN
    RAISE EXCEPTION 'Insufficient fuel in pump (% L available)', _pump.current_volume;
  END IF;
  SELECT * INTO _cfg FROM public.station_config WHERE id=1;
  _total := ROUND(_liters * _cfg.fuel_price, 2);
  INSERT INTO public.sales (pump_id, pump_number, liters, price_per_liter, total,
    pump_before, pump_after, customer_name, vehicle_plate, created_by,
    customer_id, operator_name, operator_id, fuel_type)
  VALUES (_pump.id, _pump.pump_number, _liters, _cfg.fuel_price, _total,
    _pump.current_volume, _pump.current_volume - _liters,
    NULLIF(_customer_name,''), NULLIF(_vehicle_plate,''), NULL,
    _customer_id, NULLIF(_operator_name,''), _operator_id,
    COALESCE(NULLIF(_fuel_type,''), _cfg.fuel_type))
  RETURNING * INTO _sale;
  UPDATE public.pumps SET current_volume = current_volume - _liters,
    total_sold = total_sold + _liters, total_revenue = total_revenue + _total
  WHERE id = _pump.id;
  -- auto-refill if enabled
  IF _cfg.auto_refill AND (_pump.current_volume - _liters) < _cfg.low_threshold THEN
    DECLARE _need NUMERIC; _tank_vol NUMERIC;
    BEGIN
      SELECT current_volume INTO _tank_vol FROM public.tank WHERE id=1 FOR UPDATE;
      _need := LEAST(_pump.capacity - (_pump.current_volume - _liters), _tank_vol);
      IF _need > 0 THEN
        INSERT INTO public.refills (pump_id, liters, tank_before, tank_after, pump_before, pump_after, created_by)
        VALUES (_pump.id, _need, _tank_vol, _tank_vol - _need,
                _pump.current_volume - _liters, _pump.current_volume - _liters + _need, NULL);
        UPDATE public.tank SET current_volume = current_volume - _need, updated_at=now() WHERE id=1;
        UPDATE public.pumps SET current_volume = current_volume + _need WHERE id = _pump.id;
      END IF;
    END;
  END IF;
  RETURN _sale;
END; $$;

-- 8. Refill to full helper
CREATE OR REPLACE FUNCTION public.refill_pump_to_full(_pump_id UUID)
RETURNS public.refills
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _pump public.pumps; _tank public.tank; _need NUMERIC; _refill public.refills;
BEGIN
  SELECT * INTO _pump FROM public.pumps WHERE id=_pump_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pump not found'; END IF;
  SELECT * INTO _tank FROM public.tank WHERE id=1 FOR UPDATE;
  _need := LEAST(_pump.capacity - _pump.current_volume, _tank.current_volume);
  IF _need <= 0 THEN RAISE EXCEPTION 'Nothing to refill'; END IF;
  INSERT INTO public.refills (pump_id, liters, tank_before, tank_after, pump_before, pump_after, created_by)
  VALUES (_pump.id, _need, _tank.current_volume, _tank.current_volume - _need,
          _pump.current_volume, _pump.current_volume + _need, NULL)
  RETURNING * INTO _refill;
  UPDATE public.tank SET current_volume = current_volume - _need, updated_at=now() WHERE id=1;
  UPDATE public.pumps SET current_volume = current_volume + _need WHERE id=_pump.id;
  RETURN _refill;
END; $$;
