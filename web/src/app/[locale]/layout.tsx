import { notFound } from "next/navigation";
import { I18nProvider } from "@/lib/i18n";
import { locales, type Locale } from "@/lib/i18n-config";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return (
    <I18nProvider locale={locale}>
      {children}
    </I18nProvider>
  );
}
