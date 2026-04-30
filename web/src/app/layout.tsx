import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { defaultLocale } from "@/lib/i18n-config";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Menu Risto",
  description: "Digital restaurant menu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={defaultLocale}>
      <body
        className={`${montserrat.variable} font-sans antialiased bg-gray-100 min-h-screen`}
        style={
          {
            "--color-primary": "#cc9166",
            "--color-primary-light": "#f5ebe4",
            "--color-splash": "#cc9166",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
