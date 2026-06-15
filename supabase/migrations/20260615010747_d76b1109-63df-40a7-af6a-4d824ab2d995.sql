
CREATE POLICY "auth read company-logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos');
CREATE POLICY "auth insert company-logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos');
CREATE POLICY "auth update company-logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos') WITH CHECK (bucket_id = 'company-logos');
CREATE POLICY "auth delete company-logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos');
