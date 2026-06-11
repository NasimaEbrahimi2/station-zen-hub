import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fuel } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Welcome — خوش آمدید" }] }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"ask" | "greet">("ask");
  const [company, setCompany] = useState("");

  // Pre-fill if already stored
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("company_name") : null;
    if (saved) setCompany(saved);
  }, []);

  useEffect(() => {
    if (step !== "greet") return;
    const t = setTimeout(() => navigate({ to: "/dashboard" }), 2800);
    return () => clearTimeout(t);
  }, [step, navigate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = company.trim();
    if (!name) return;
    localStorage.setItem("company_name", name);
    setStep("greet");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-14 rounded-2xl bg-primary grid place-items-center shadow-lg">
            <Fuel className="size-7 text-primary-foreground" />
          </div>
        </div>

        {step === "ask" ? (
          <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
              <p className="text-lg text-muted-foreground" dir="rtl">خوش آمدید</p>
              <p className="text-sm text-muted-foreground pt-2">
                Please enter your company name.
                <br />
                <span dir="rtl">لطفاً نام شرکت خود را وارد کنید.</span>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Company Name <span className="text-muted-foreground">/ نام شرکت</span>
              </label>
              <input
                autoFocus
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Pars Fuel Co. / مثلاً شرکت سوخت پارس"
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={!company.trim()}
              className="w-full rounded-md bg-primary text-primary-foreground font-medium py-2.5 hover:opacity-90 transition disabled:opacity-50"
            >
              Continue / ادامه
            </button>
          </form>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-10 shadow-sm text-center space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome to {company}!</h1>
            <p className="text-xl text-muted-foreground" dir="rtl">به {company} خوش آمدید!</p>
            <p className="text-xs text-muted-foreground pt-4 animate-pulse">
              Redirecting to dashboard… / در حال انتقال به داشبورد…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
