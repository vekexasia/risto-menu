"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { I18nProvider } from "@/lib/i18n";
import { locales, adminLocale, type Locale } from "@/lib/i18n-config";

const ADMIN_LOCALE_KEY = "risto-admin-locale";

type AdminLocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const AdminLocaleContext = createContext<AdminLocaleContextValue>({
  locale: adminLocale,
  setLocale: () => {},
});

export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(adminLocale);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADMIN_LOCALE_KEY);
      if (stored && (locales as readonly string[]).includes(stored)) {
        setLocaleState(stored as Locale);
      }
    } catch {
      // localStorage unavailable (e.g. private mode) — stay on env default.
    }
  }, []);

  const setLocale = (l: Locale) => {
    try {
      window.localStorage.setItem(ADMIN_LOCALE_KEY, l);
    } catch {
      // ignore — still update in-memory so the session reflects the choice.
    }
    setLocaleState(l);
  };

  return (
    <AdminLocaleContext.Provider value={{ locale, setLocale }}>
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </AdminLocaleContext.Provider>
  );
}

export function useAdminLocale() {
  return useContext(AdminLocaleContext);
}
