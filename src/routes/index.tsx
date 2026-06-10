import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
    throw redirect({ to: "/auth" });
  },
  component: () => (
    <div className="min-h-screen grid-bg grid place-items-center">
      <Link to="/auth" className="text-primary underline">Continue to sign in</Link>
    </div>
  ),
});
