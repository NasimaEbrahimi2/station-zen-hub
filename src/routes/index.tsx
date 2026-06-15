import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Fuel, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [{ title: "سیستم مدیریت پمپ بنزین" }] }),
  component: Bootstrap,
});

function Bootstrap() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("company_profile")
        .select("id")
        .maybeSingle();
      if (error || !data) {
        navigate({ to: "/onboarding/company", replace: true });
      } else {
        navigate({ to: "/dashboard", replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background" dir="rtl">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="size-14 rounded-2xl bg-primary grid place-items-center shadow-lg">
          <Fuel className="size-7 text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> در حال بارگذاری سیستم…
        </p>
      </div>
    </div>
  );
}
