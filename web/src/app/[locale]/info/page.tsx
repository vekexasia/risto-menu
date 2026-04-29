"use client";

import { useTranslations } from "@/lib/i18n";
import Link from "next/link";

export default function InfoPage() {
  const t = useTranslations();

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-primary text-white p-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">{t("restaurantInfo")}</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Restaurant section */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-bold text-primary mb-3">
            {t("restaurant")}
          </h2>
          <p className="text-gray-600">
            Benvenuti al Ristorante Miravalle, dove la tradizione incontra
            l&apos;innovazione culinaria.
          </p>
        </section>

        {/* Location section */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-bold text-primary mb-3">
            {t("location")}
          </h2>
          <p className="text-gray-600">Via Example, 123</p>
          <p className="text-gray-600">30016 Jesolo (VE)</p>
          <button className="mt-3 text-primary font-medium flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            {t("seeMap")}
          </button>
        </section>

        {/* Contacts section */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-bold text-primary mb-3">
            {t("contacts")}
          </h2>
          <button className="text-primary font-medium flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
              />
            </svg>
            {t("call")}
          </button>
        </section>

        {/* Opening hours section */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-bold text-primary mb-3">
            {t("openingHours")}
          </h2>
          <div className="space-y-2 text-gray-600">
            <div className="flex justify-between">
              <span>{t("monday")}</span>
              <span>12:00 - 22:00</span>
            </div>
            <div className="flex justify-between">
              <span>{t("tuesday")}</span>
              <span>12:00 - 22:00</span>
            </div>
            <div className="flex justify-between">
              <span>{t("wednesday")}</span>
              <span>{t("closed")}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("thursday")}</span>
              <span>12:00 - 22:00</span>
            </div>
            <div className="flex justify-between">
              <span>{t("friday")}</span>
              <span>12:00 - 23:00</span>
            </div>
            <div className="flex justify-between">
              <span>{t("saturday")}</span>
              <span>12:00 - 23:00</span>
            </div>
            <div className="flex justify-between">
              <span>{t("sunday")}</span>
              <span>12:00 - 22:00</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
