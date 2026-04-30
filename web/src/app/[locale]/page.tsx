"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useRestaurantStore } from "@/stores/restaurantStore";
import { RestaurantInfoModal } from "@/components/menu/RestaurantInfoModal";
import { PromotionPopup } from "@/components/menu/PromotionPopup";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { getContentDisplayText } from "@/lib/content-presentation";

export default function HomePage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const { data, isLoading, error, loadRestaurant } = useRestaurantStore();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  // Show promotion popup once per session when valid
  useEffect(() => {
    if (!data?.promotion) return;
    const promo = data.promotion;

    // Check tillDate — skip if expired
    if (promo.tillDate) {
      const till = new Date(promo.tillDate);
      if (Date.now() > till.getTime()) return;
    }

    // Only show once per session
    if (sessionStorage.getItem('promo_seen')) return;

    setShowPromo(true);
  }, [data?.promotion]);

  const handlePromoClose = () => {
    setShowPromo(false);
    sessionStorage.setItem('promo_seen', '1');
  };

  // Get current opening hours
  const getOpeningHours = () => {
    if (!data?.openingSchedule?.seated?.schedule) return null;
    const workingHours = data.openingSchedule.seated;
    const today = new Date().getDay();
    // Convert JS day (0=Sunday) to schedule index (0=Monday)
    const dayIndex = today === 0 ? 6 : today - 1;
    const todaySchedule = workingHours.schedule[dayIndex];
    if (!todaySchedule || todaySchedule.length === 0) return null;
    return todaySchedule.map((slot) => `${slot.start} - ${slot.end}`).join("  ");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => loadRestaurant()}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const openingHours = getOpeningHours();
  const seatedMenuTitle = getContentDisplayText({
    entity: data.menus?.seated || { title: "MENU" },
    field: "title",
    locale,
    restaurantId: data.id,
  });
  const takeawayMenuTitle = getContentDisplayText({
    entity: data.menus?.takeaway || { title: t("wineAndBeers") },
    field: "title",
    locale,
    restaurantId: data.id,
  });

  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      {/* Header with image */}
      <header className="relative" data-locale-anchor="home:header">
        {data.headerImage && (
          <div className="relative h-32 md:h-48 w-full">
            <Image
              src={data.headerImage}
              alt={data.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Restaurant info card */}
        <div className="relative -mt-20 mx-4">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <h1
              className="text-2xl md:text-3xl font-bold text-primary tracking-wider italic"
              style={{ fontFamily: data.theme?.font || "inherit" }}
            >
              {data.name?.toUpperCase()}
            </h1>

            {/* Opening hours */}
            {openingHours && (
              <p className="text-sm text-gray-600 mt-2">{openingHours}</p>
            )}

            {/* Icons row */}
            <div className="flex justify-center gap-6 mt-4 text-gray-400">
              {data.info?.latlong && (
                <a
                  href={`https://maps.google.com/?q=${data.info.latlong.latitude},${data.info.latlong.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:text-primary transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </a>
              )}
              <button onClick={() => setShowInfoModal(true)} className="p-2 hover:text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </button>
              {data.info?.phone && (
                <a href={`tel:${data.info.phone}`} className="p-2 hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </a>
              )}
              <button onClick={() => setShowInfoModal(true)} className="p-2 hover:text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            {/* More infos link */}
            <button onClick={() => setShowInfoModal(true)} className="text-sm text-gray-400 mt-3 block w-full text-center hover:text-primary">
              {t("moreInfos")}
            </button>
          </div>
        </div>
      </header>

      {/* Menu selection cards */}
      <div className="px-4 py-8">
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Menu card */}
          <Link
            href={`/${locale}/menu`}
            data-locale-anchor="home:menu-seated"
            className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center aspect-square hover:shadow-xl transition-shadow"
          >
            <div className="w-32 h-32 mb-4 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Plate */}
                <ellipse cx="50" cy="55" rx="35" ry="25" fill="#d4a574" />
                <ellipse cx="50" cy="50" rx="30" ry="20" fill="#e8c9a8" />
                {/* Fork */}
                <rect x="20" y="20" width="3" height="40" fill="#888" rx="1" />
                <rect x="17" y="15" width="2" height="8" fill="#888" rx="1" />
                <rect x="20" y="15" width="2" height="8" fill="#888" rx="1" />
                <rect x="23" y="15" width="2" height="8" fill="#888" rx="1" />
                {/* Knife */}
                <rect x="75" y="20" width="4" height="40" fill="#888" rx="1" />
                <path d="M75 15 L79 15 L79 25 L75 25 Z" fill="#888" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-gray-800 uppercase tracking-wide">
              <span className="block">{seatedMenuTitle.primary}</span>
              {seatedMenuTitle.secondary && (
                <span className="mt-0.5 block text-xs font-medium normal-case text-gray-500">
                  {seatedMenuTitle.secondary}
                </span>
              )}
            </span>
          </Link>

          {/* Wine & Beers card */}
          <Link
            href={`/${locale}/menu?type=drinks`}
            data-locale-anchor="home:menu-drinks"
            className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center aspect-square hover:shadow-xl transition-shadow"
          >
            <div className="w-32 h-32 mb-4 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Wine bottle */}
                <rect x="30" y="30" width="15" height="50" fill="#1a1a1a" rx="2" />
                <rect x="33" y="20" width="9" height="12" fill="#1a1a1a" rx="1" />
                <rect x="32" y="35" width="11" height="15" fill="#d4a574" rx="1" />
                {/* Wine glass */}
                <path d="M60 70 L60 85 L55 85 L55 70" fill="#888" />
                <ellipse cx="60" cy="85" rx="8" ry="3" fill="#888" />
                <path d="M50 40 Q50 55 55 65 L65 65 Q70 55 70 40 Z" fill="none" stroke="#888" strokeWidth="2" />
                <ellipse cx="60" cy="40" rx="10" ry="4" fill="none" stroke="#888" strokeWidth="2" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-gray-800 uppercase tracking-wide">
              <span className="block">{takeawayMenuTitle.primary}</span>
              {takeawayMenuTitle.secondary && (
                <span className="mt-0.5 block text-xs font-medium normal-case text-gray-500">
                  {takeawayMenuTitle.secondary}
                </span>
              )}
            </span>
          </Link>
        </div>
      </div>

      {/* Restaurant Info Modal */}
      <RestaurantInfoModal
        restaurant={data}
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />

      {/* Promotion popup */}
      {data.promotion && (
        <PromotionPopup
          promotion={data.promotion}
          open={showPromo}
          onClose={handlePromoClose}
        />
      )}

      <Suspense><LanguagePicker /></Suspense>
    </main>
  );
}
