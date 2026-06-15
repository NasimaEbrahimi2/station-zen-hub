
CREATE TABLE IF NOT EXISTS public.company_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL,
  owner_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'AFN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_profile TO authenticated;
GRANT ALL ON public.company_profile TO service_role;

ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read company"
  ON public.company_profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert company"
  ON public.company_profile FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update company"
  ON public.company_profile FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_company_profile_updated
  BEFORE UPDATE ON public.company_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
