import { createContext, useContext, useEffect, type ReactNode } from "react";

export type Lang = "fa";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (en: string, fa: string) => string;
  dir: "rtl";
};

const I18nContext = createContext<Ctx | null>(null);

/**
 * Application is locked to Persian (Dari) with RTL layout.
 * The `t(en, fa)` helper and `LanguageSwitcher` are kept as no-ops for
 * backward compatibility with existing call sites.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = "fa";
    document.documentElement.dir = "rtl";
  }, []);

  const value: Ctx = {
    lang: "fa",
    setLang: () => {},
    t: (_en, fa) => fa,
    dir: "rtl",
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}

/** Kept as a no-op render so older imports do not break. */
export function LanguageSwitcher(_: { className?: string }) {
  return null;
}
