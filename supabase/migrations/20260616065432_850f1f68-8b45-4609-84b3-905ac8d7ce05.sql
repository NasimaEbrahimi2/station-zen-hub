
-- Sales: allow authenticated to insert/update/delete (read already exists)
CREATE POLICY "Auth write sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update sales" ON public.sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete sales" ON public.sales FOR DELETE TO authenticated USING (true);

-- Refills
CREATE POLICY "Auth write refills" ON public.refills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update refills" ON public.refills FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete refills" ON public.refills FOR DELETE TO authenticated USING (true);

-- Pumps
CREATE POLICY "Auth write pumps" ON public.pumps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update pumps" ON public.pumps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete pumps" ON public.pumps FOR DELETE TO authenticated USING (true);

-- Tank
CREATE POLICY "Auth write tank" ON public.tank FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update tank" ON public.tank FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete tank" ON public.tank FOR DELETE TO authenticated USING (true);

-- Tank deliveries
CREATE POLICY "Auth write deliveries" ON public.tank_deliveries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update deliveries" ON public.tank_deliveries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete deliveries" ON public.tank_deliveries FOR DELETE TO authenticated USING (true);

-- Station config: allow insert for first-time setup
CREATE POLICY "Auth insert station_config" ON public.station_config FOR INSERT TO authenticated WITH CHECK (true);

-- Company profile: allow delete for admin
CREATE POLICY "Auth delete company" ON public.company_profile FOR DELETE TO authenticated USING (true);

-- Tighten public-role policies to authenticated only
DROP POLICY IF EXISTS "public write attendance" ON public.attendance;
DROP POLICY IF EXISTS "public read attendance" ON public.attendance;
CREATE POLICY "Auth manage attendance" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public write customers" ON public.customers;
DROP POLICY IF EXISTS "public read customers" ON public.customers;
CREATE POLICY "Auth manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public write employees" ON public.employees;
DROP POLICY IF EXISTS "public read employees" ON public.employees;
CREATE POLICY "Auth manage employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read salaries" ON public.salary_payments;
DROP POLICY IF EXISTS "public write salaries" ON public.salary_payments;
CREATE POLICY "Auth manage salaries" ON public.salary_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
