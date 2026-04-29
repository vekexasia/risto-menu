import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Menu Risto",
  description: "Menu digitale del ristorante",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
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
