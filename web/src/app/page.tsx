"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { defaultLocale } from "@/lib/i18n-config";

/**
 * Root path redirects to the menu in the default locale. Single-tenant model:
 * there is exactly one menu per deployment, served at /{locale}/menu.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const lang = typeof navigator !== "undefined"
      ? navigator.language.split("-")[0]
      : defaultLocale;
    const supported = ["it", "en", "de", "fr", "es", "nl", "ru", "pt", "vec"];
    const locale = supported.includes(lang) ? lang : defaultLocale;
    router.replace(`/${locale}/menu`);
  }, [router]);

  return null;
}
