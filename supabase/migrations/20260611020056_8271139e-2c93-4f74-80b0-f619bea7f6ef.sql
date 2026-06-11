
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_created_by_fkey;
ALTER TABLE public.refills DROP CONSTRAINT IF EXISTS refills_created_by_fkey;
ALTER TABLE public.tank_deliveries DROP CONSTRAINT IF EXISTS tank_deliveries_created_by_fkey;

CREATE OR REPLACE FUNCTION public.record_sale(_pump_id uuid, _liters numeric, _customer_name text, _vehicle_plate text)
RETURNS public.sales
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  _pump public.pumps; _price NUMERIC; _total NUMERIC; _sale public.sales;
BEGIN
  IF _liters <= 0 THEN RAISE EXCEPTION 'Liters must be > 0'; END IF;
  SELECT * INTO _pump FROM public.pumps WHERE id = _pump_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pump not found'; END IF;
  IF _pump.current_volume < _liters THEN
    RAISE EXCEPTION 'Insufficient fuel in pump (% L available)', _pump.current_volume;
  END IF;
  SELECT fuel_price INTO _price FROM public.station_config WHERE id=1;
  _total := ROUND(_liters * _price, 2);
  INSERT INTO public.sales (pump_id, pump_number, liters, price_per_liter, total, pump_before, pump_after, customer_name, vehicle_plate, created_by)
  VALUES (_pump.id, _pump.pump_number, _liters, _price, _total, _pump.current_volume, _pump.current_volume - _liters, NULLIF(_customer_name,''), NULLIF(_vehicle_plate,''), NULL)
  RETURNING * INTO _sale;
  UPDATE public.pumps SET current_volume = current_volume - _liters, total_sold = total_sold + _liters, total_revenue = total_revenue + _total
  WHERE id = _pump.id;
  RETURN _sale;
END; $function$;

CREATE OR REPLACE FUNCTION public.record_refill(_pump_id uuid, _liters numeric)
RETURNS public.refills
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE _pump public.pumps; _tank public.tank; _refill public.refills;
BEGIN
  IF _liters <= 0 THEN RAISE EXCEPTION 'Liters must be > 0'; END IF;
  SELECT * INTO _pump FROM public.pumps WHERE id = _pump_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pump not found'; END IF;
  SELECT * INTO _tank FROM public.tank WHERE id = 1 FOR UPDATE;
  IF _tank.current_volume < _liters THEN RAISE EXCEPTION 'Insufficient tank volume'; END IF;
  IF _pump.current_volume + _liters > _pump.capacity THEN
    RAISE EXCEPTION 'Exceeds pump capacity (% L)', _pump.capacity; END IF;
  INSERT INTO public.refills (pump_id, liters, tank_before, tank_after, pump_before, pump_after, created_by)
  VALUES (_pump.id, _liters, _tank.current_volume, _tank.current_volume - _liters, _pump.current_volume, _pump.current_volume + _liters, NULL)
  RETURNING * INTO _refill;
  UPDATE public.tank SET current_volume = current_volume - _liters, updated_at = now() WHERE id = 1;
  UPDATE public.pumps SET current_volume = current_volume + _liters WHERE id = _pump.id;
  RETURN _refill;
END; $function$;

CREATE OR REPLACE FUNCTION public.record_delivery(_liters numeric, _cost numeric, _supplier text)
RETURNS public.tank_deliveries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE _tank public.tank; _del public.tank_deliveries; _cap NUMERIC;
BEGIN
  IF _liters <= 0 THEN RAISE EXCEPTION 'Liters must be > 0'; END IF;
  SELECT * INTO _tank FROM public.tank WHERE id=1 FOR UPDATE;
  SELECT tank_capacity INTO _cap FROM public.station_config WHERE id=1;
  IF _tank.current_volume + _liters > _cap THEN RAISE EXCEPTION 'Exceeds tank capacity (% L)', _cap; END IF;
  INSERT INTO public.tank_deliveries (liters, cost, supplier, previous_volume, new_volume, created_by)
  VALUES (_liters, _cost, NULLIF(_supplier,''), _tank.current_volume, _tank.current_volume + _liters, NULL)
  RETURNING * INTO _del;
  UPDATE public.tank SET current_volume = current_volume + _liters, updated_at = now() WHERE id=1;
  RETURN _del;
END; $function$;
