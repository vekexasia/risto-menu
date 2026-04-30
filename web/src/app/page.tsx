"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { defaultLocale } from "@/lib/i18n-config";

/**
 * Root path redirects to the menu in the deployment's default locale.
 * Single-tenant model: there is exactly one menu per deployment, served at /{locale}/menu.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${defaultLocale}/menu`);
  }, [router]);

  return null;
}
