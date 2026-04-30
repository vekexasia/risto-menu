"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { defaultLocale } from "@/lib/i18n-config";

/**
 * Root path redirects to the localized home page in the deployment's default
 * locale. From there the diner picks a language and enters a menu.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${defaultLocale}`);
  }, [router]);

  return null;
}
