
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Trigger to auto-create profile + assign first user as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Station config (singleton)
CREATE TABLE public.station_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  fuel_price NUMERIC(10,3) NOT NULL DEFAULT 1.500,
  tank_capacity NUMERIC(12,2) NOT NULL DEFAULT 20000,
  station_name TEXT NOT NULL DEFAULT 'Fuel Station',
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.station_config TO authenticated;
GRANT UPDATE ON public.station_config TO authenticated;
GRANT ALL ON public.station_config TO service_role;
ALTER TABLE public.station_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read config" ON public.station_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update config" ON public.station_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.station_config (id) VALUES (1);

-- Tank (singleton)
CREATE TABLE public.tank (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_volume NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tank TO authenticated;
GRANT ALL ON public.tank TO service_role;
ALTER TABLE public.tank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read tank" ON public.tank FOR SELECT TO authenticated USING (true);
INSERT INTO public.tank (id) VALUES (1);

-- Pumps
CREATE TABLE public.pumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pump_number INT NOT NULL UNIQUE CHECK (pump_number BETWEEN 1 AND 99),
  current_volume NUMERIC(12,2) NOT NULL DEFAULT 0,
  capacity NUMERIC(12,2) NOT NULL DEFAULT 500,
  total_sold NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pumps TO authenticated;
GRANT ALL ON public.pumps TO service_role;
ALTER TABLE public.pumps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read pumps" ON public.pumps FOR SELECT TO authenticated USING (true);

INSERT INTO public.pumps (pump_number, current_volume, capacity) VALUES
  (1, 300, 500),(2, 300, 500),(3, 300, 500),(4, 300, 500),(5, 300, 500),(6, 300, 500);

-- Tank deliveries (outside fuel arriving)
CREATE TABLE public.tank_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liters NUMERIC(12,2) NOT NULL CHECK (liters > 0),
  cost NUMERIC(14,2),
  supplier TEXT,
  previous_volume NUMERIC(12,2) NOT NULL,
  new_volume NUMERIC(12,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tank_deliveries TO authenticated;
GRANT ALL ON public.tank_deliveries TO service_role;
ALTER TABLE public.tank_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read deliveries" ON public.tank_deliveries FOR SELECT TO authenticated USING (true);

-- Refills (tank -> pump)
CREATE TABLE public.refills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pump_id UUID NOT NULL REFERENCES public.pumps(id),
  liters NUMERIC(12,2) NOT NULL CHECK (liters > 0),
  tank_before NUMERIC(12,2) NOT NULL,
  tank_after NUMERIC(12,2) NOT NULL,
  pump_before NUMERIC(12,2) NOT NULL,
  pump_after NUMERIC(12,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.refills TO authenticated;
GRANT ALL ON public.refills TO service_role;
ALTER TABLE public.refills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read refills" ON public.refills FOR SELECT TO authenticated USING (true);

-- Sales / invoices
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1000;

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE DEFAULT ('INV-' || nextval('public.invoice_seq')),
  pump_id UUID NOT NULL REFERENCES public.pumps(id),
  pump_number INT NOT NULL,
  liters NUMERIC(12,3) NOT NULL CHECK (liters > 0),
  price_per_liter NUMERIC(10,3) NOT NULL CHECK (price_per_liter > 0),
  total NUMERIC(14,2) NOT NULL,
  pump_before NUMERIC(12,2) NOT NULL,
  pump_after NUMERIC(12,2) NOT NULL,
  customer_name TEXT,
  vehicle_plate TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read sales" ON public.sales FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_sales_created_at ON public.sales (created_at DESC);
CREATE INDEX idx_sales_pump ON public.sales (pump_id);
CREATE INDEX idx_refills_created_at ON public.refills (created_at DESC);

-- Atomic sale function (bypasses RLS via SECURITY DEFINER; staff/admin only)
CREATE OR REPLACE FUNCTION public.record_sale(_pump_id UUID, _liters NUMERIC, _customer_name TEXT, _vehicle_plate TEXT)
RETURNS public.sales LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pump public.pumps;
  _price NUMERIC;
  _total NUMERIC;
  _sale public.sales;
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'staff')) THEN
    RAISE EXCEPTION 'Insufficient privileges'; END IF;
  IF _liters <= 0 THEN RAISE EXCEPTION 'Liters must be > 0'; END IF;

  SELECT * INTO _pump FROM public.pumps WHERE id = _pump_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pump not found'; END IF;
  IF _pump.current_volume < _liters THEN
    RAISE EXCEPTION 'Insufficient fuel in pump (% L available)', _pump.current_volume;
  END IF;

  SELECT fuel_price INTO _price FROM public.station_config WHERE id=1;
  _total := ROUND(_liters * _price, 2);

  INSERT INTO public.sales (pump_id, pump_number, liters, price_per_liter, total, pump_before, pump_after, customer_name, vehicle_plate, created_by)
  VALUES (_pump.id, _pump.pump_number, _liters, _price, _total, _pump.current_volume, _pump.current_volume - _liters, NULLIF(_customer_name,''), NULLIF(_vehicle_plate,''), _uid)
  RETURNING * INTO _sale;

  UPDATE public.pumps SET
    current_volume = current_volume - _liters,
    total_sold = total_sold + _liters,
    total_revenue = total_revenue + _total
  WHERE id = _pump.id;

  RETURN _sale;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_sale(UUID,NUMERIC,TEXT,TEXT) TO authenticated;

-- Atomic refill (tank -> pump)
CREATE OR REPLACE FUNCTION public.record_refill(_pump_id UUID, _liters NUMERIC)
RETURNS public.refills LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pump public.pumps;
  _tank public.tank;
  _refill public.refills;
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'staff')) THEN
    RAISE EXCEPTION 'Insufficient privileges'; END IF;
  IF _liters <= 0 THEN RAISE EXCEPTION 'Liters must be > 0'; END IF;

  SELECT * INTO _pump FROM public.pumps WHERE id = _pump_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pump not found'; END IF;
  SELECT * INTO _tank FROM public.tank WHERE id = 1 FOR UPDATE;
  IF _tank.current_volume < _liters THEN RAISE EXCEPTION 'Insufficient tank volume'; END IF;
  IF _pump.current_volume + _liters > _pump.capacity THEN
    RAISE EXCEPTION 'Exceeds pump capacity (% L)', _pump.capacity; END IF;

  INSERT INTO public.refills (pump_id, liters, tank_before, tank_after, pump_before, pump_after, created_by)
  VALUES (_pump.id, _liters, _tank.current_volume, _tank.current_volume - _liters, _pump.current_volume, _pump.current_volume + _liters, _uid)
  RETURNING * INTO _refill;

  UPDATE public.tank SET current_volume = current_volume - _liters, updated_at = now() WHERE id = 1;
  UPDATE public.pumps SET current_volume = current_volume + _liters WHERE id = _pump.id;
  RETURN _refill;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_refill(UUID,NUMERIC) TO authenticated;

-- Tank delivery (admin only)
CREATE OR REPLACE FUNCTION public.record_delivery(_liters NUMERIC, _cost NUMERIC, _supplier TEXT)
RETURNS public.tank_deliveries LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tank public.tank;
  _del public.tank_deliveries;
  _uid UUID := auth.uid();
  _cap NUMERIC;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _liters <= 0 THEN RAISE EXCEPTION 'Liters must be > 0'; END IF;
  SELECT * INTO _tank FROM public.tank WHERE id=1 FOR UPDATE;
  SELECT tank_capacity INTO _cap FROM public.station_config WHERE id=1;
  IF _tank.current_volume + _liters > _cap THEN RAISE EXCEPTION 'Exceeds tank capacity (% L)', _cap; END IF;

  INSERT INTO public.tank_deliveries (liters, cost, supplier, previous_volume, new_volume, created_by)
  VALUES (_liters, _cost, NULLIF(_supplier,''), _tank.current_volume, _tank.current_volume + _liters, _uid)
  RETURNING * INTO _del;

  UPDATE public.tank SET current_volume = current_volume + _liters, updated_at = now() WHERE id=1;
  RETURN _del;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_delivery(NUMERIC,NUMERIC,TEXT) TO authenticated;
