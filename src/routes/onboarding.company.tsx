import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Fuel, Loader2, Upload } from "lucide-react";

export const Route = createFileRoute("/onboarding/company")({
  ssr: false,
  head: () => ({ meta: [{ title: "ثبت شرکت — سیستم مدیریت پمپ بنزین" }] }),
  component: OnboardingCompany,
});

function OnboardingCompany() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    owner_name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    tax_id: "",
  });

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("حجم لوگو نباید بیشتر از ۲ مگابایت باشد");
      return;
    }
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("نام شرکت الزامی است");
      return;
    }
    setSubmitting(true);
    try {
      let logo_url: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("company-logos")
          .upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("company-logos")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        logo_url = signed?.signedUrl ?? null;
      }
      const payload: any = {
        id: 1,
        name: form.name.trim(),
        owner_name: form.owner_name.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        tax_id: form.tax_id.trim() || null,
        logo_url,
        currency: "AFN",
      };
      const { error } = await supabase.from("company_profile").upsert(payload);
      if (error) throw error;
      toast.success("اطلاعات شرکت ذخیره شد");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message || "خطا در ذخیره اطلاعات");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-14 rounded-2xl bg-primary grid place-items-center shadow-lg mb-3">
            <Fuel className="size-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">ثبت اطلاعات شرکت</h1>
          <p className="text-sm text-muted-foreground mt-1">
            برای شروع، لطفاً اطلاعات شرکت خود را وارد کنید.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>اطلاعات شرکت</CardTitle>
            <CardDescription>این اطلاعات در فاکتورها و گزارش‌ها استفاده می‌شود.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="name">نام شرکت *</Label>
                <Input id="name" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثلاً شرکت سوخت پارس" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner">نام مالک</Label>
                <Input id="owner" value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">شماره تماس</Label>
                <Input id="phone" value={form.phone} dir="ltr"
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+93 ..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">آدرس ایمیل</Label>
                <Input id="email" type="email" value={form.email} dir="ltr"
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">آدرس وب‌سایت</Label>
                <Input id="website" value={form.website} dir="ltr"
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://example.com" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="address">آدرس</Label>
                <Textarea id="address" rows={2} value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax">شناسه مالیاتی (در صورت وجود)</Label>
                <Input id="tax" value={form.tax_id}
                  onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logo">لوگوی شرکت</Label>
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img src={logoPreview} alt="logo" className="size-12 rounded-md object-cover border" />
                  ) : (
                    <div className="size-12 rounded-md border border-dashed grid place-items-center text-muted-foreground">
                      <Upload className="size-4" />
                    </div>
                  )}
                  <Input id="logo" type="file" accept="image/*" onChange={onLogoChange} />
                </div>
              </div>

              <div className="md:col-span-2 pt-2 flex justify-end">
                <Button type="submit" disabled={submitting} className="min-w-40">
                  {submitting ? (
                    <><Loader2 className="size-4 animate-spin ml-2" /> در حال ذخیره…</>
                  ) : (
                    "ذخیره و ورود به سیستم"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
