import "./admin.css";
import { AdminI18nProvider } from "./AdminI18nProvider";

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
      <AdminI18nProvider>{children}</AdminI18nProvider>
    </>
  );
}
