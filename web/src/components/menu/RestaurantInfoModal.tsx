'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Dialog, DialogPanel } from '@headlessui/react';
import { useTranslations } from '@/lib/i18n';
import { Suspense, useState, useCallback } from 'react';
import type { RestaurantData, TimeSlot } from '@/lib/types';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { LanguagePicker } from '@/components/ui/LanguagePicker';

interface RestaurantInfoModalProps {
  restaurant: RestaurantData;
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export function RestaurantInfoModal({ restaurant, isOpen, onClose }: RestaurantInfoModalProps) {
  const t = useTranslations();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  }, [onClose]);

  // Close modal on browser back button press
  useBackButtonClose(isOpen, handleClose);

  const formatTimeSlots = (slots: TimeSlot[] | undefined): string => {
    if (!slots || slots.length === 0) {
      return t('closed');
    }
    return slots.map(slot => `${slot.start} - ${slot.end}`).join(', ');
  };

  const openMap = () => {
    if (restaurant.info?.latlong) {
      const { latitude, longitude } = restaurant.info.latlong;
      window.open(
        `https://www.google.com/maps/place/${latitude},${longitude}/@${latitude},${longitude},14z`,
        '_blank'
      );
    }
  };

  const callPhone = () => {
    if (restaurant.info?.phone) {
      window.location.href = `tel:${restaurant.info.phone}`;
    }
  };

  const openFacebook = () => {
    if (restaurant.socials?.facebook) {
      window.open(restaurant.socials.facebook, '_blank');
    }
  };

  const openInstagram = () => {
    if (restaurant.socials?.instagram) {
      window.open(restaurant.socials.instagram, '_blank');
    }
  };

  const openWhatsapp = () => {
    if (restaurant.socials?.whatsapp) {
      window.open(`https://wa.me/${restaurant.socials.whatsapp}?text=Ciao, `, '_blank');
    }
  };

  // Get today's day index (0 = Monday in our array, but Date.getDay() returns 0 = Sunday)
  const todayIndex = (new Date().getDay() + 6) % 7;

  const hasSocials = restaurant.socials?.facebook || restaurant.socials?.instagram || restaurant.socials?.whatsapp;

  // Don't render anything if not open (and not in closing animation)
  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <Dialog
      as="div"
      className="relative z-50"
      open={isOpen || isClosing}
      onClose={handleClose}
      static
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 bg-black/60"
        onClick={handleClose}
      />

      {/* Content - Fullscreen from bottom */}
      <div className="fixed inset-0 flex items-end justify-center pointer-events-none">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: isClosing ? '100%' : 0 }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300,
          }}
          className="w-full h-full pointer-events-auto"
        >
          <DialogPanel className="relative bg-white h-full overflow-y-auto">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 bg-white/90 rounded-full p-2 shadow-lg hover:bg-white transition-colors z-30"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 text-gray-600"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header Image */}
            {restaurant.headerImage && (
              <div className="relative w-full h-48">
                <Image
                  src={restaurant.headerImage}
                  alt={restaurant.name}
                  fill
                  className="object-cover"
                  priority
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {/* Restaurant name overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
                  {restaurant.payoff && (
                    <p className="text-white/90 text-sm mt-1">{restaurant.payoff}</p>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Social Icons */}
              {hasSocials && (
                <div className="flex gap-3">
                  {restaurant.socials?.facebook && (
                    <button onClick={openFacebook} className="hover:opacity-80 transition-opacity">
                      <Image
                        src="/images/ico-fb.png"
                        alt="Facebook"
                        width={32}
                        height={32}
                      />
                    </button>
                  )}
                  {restaurant.socials?.instagram && (
                    <button onClick={openInstagram} className="hover:opacity-80 transition-opacity">
                      <Image
                        src="/images/ico-ig.png"
                        alt="Instagram"
                        width={32}
                        height={32}
                      />
                    </button>
                  )}
                  {restaurant.socials?.whatsapp && (
                    <button onClick={openWhatsapp} className="hover:opacity-80 transition-opacity">
                      <Image
                        src="/images/ico-whatsapp.png"
                        alt="WhatsApp"
                        width={32}
                        height={32}
                      />
                    </button>
                  )}
                </div>
              )}

              {/* LANGUAGE */}
              <Section title={t('language')}>
                <Suspense><LanguagePicker variant="inline" /></Suspense>
              </Section>

              {/* IL RISTORANTE */}
              {restaurant.messages?.intro && (
                <Section title={t('restaurant')}>
                  <p className="text-gray-600 leading-relaxed">{restaurant.messages.intro}</p>
                </Section>
              )}

              {/* DOVE SIAMO */}
              {restaurant.info && (
                <Section
                  title={t('location')}
                  action={
                    restaurant.info.latlong ? (
                      <button
                        onClick={openMap}
                        className="text-primary font-medium hover:underline"
                      >
                        {t('seeMap')}
                      </button>
                    ) : undefined
                  }
                >
                  <p className="text-gray-600 leading-relaxed">
                    {restaurant.info.addressLine1}
                    {restaurant.info.city && (
                      <>
                        <br />
                        {restaurant.info.city}
                        {restaurant.info.region && ` (${restaurant.info.region})`}
                      </>
                    )}
                  </p>
                </Section>
              )}

              {/* CONTATTI */}
              {restaurant.info?.phone && (
                <Section
                  title={t('contacts')}
                  action={
                    <button
                      onClick={callPhone}
                      className="text-primary font-medium hover:underline"
                    >
                      {t('call')}
                    </button>
                  }
                >
                  <p className="text-gray-600">T: {restaurant.info.phone}</p>
                </Section>
              )}

              {/* CONDIZIONI */}
              {restaurant.messages?.terms && (
                <Section title={t('terms')}>
                  <p className="text-gray-600 leading-relaxed">{restaurant.messages.terms}</p>
                </Section>
              )}

              {/* ORARI DI APERTURA */}
              {restaurant.openingSchedule?.seated && (
                <Section title={t('openingHours')}>
                  <div className="space-y-1">
                    {DAYS.map((day, index) => {
                      const isToday = index === todayIndex;
                      const slots = restaurant.openingSchedule?.seated?.schedule?.[index];
                      return (
                        <div
                          key={day}
                          className={`flex justify-between py-1 ${isToday ? 'font-bold' : ''}`}
                        >
                          <span className="text-gray-700">{t(day)}</span>
                          <span className="text-gray-600 text-right">{formatTimeSlots(slots)}</span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* ALLERGENI */}
              {restaurant.messages?.allergens && (
                <Section title={t('allergens')}>
                  <p className="text-gray-600 leading-relaxed">{restaurant.messages.allergens}</p>
                </Section>
              )}

              {/* Bottom padding for safe area */}
              <div className="h-8" />
            </div>
          </DialogPanel>
        </motion.div>
      </div>
    </Dialog>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function Section({ title, children, action }: SectionProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold text-gray-800 tracking-wide">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
