import "./admin.css";
import { I18nProvider } from "@/lib/i18n";
import { adminLocale } from "@/lib/i18n-config";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Font Awesome — hoisted by Next.js to <head> */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      <I18nProvider locale={adminLocale}>{children}</I18nProvider>
    </>
  );
}
