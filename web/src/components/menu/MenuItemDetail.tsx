'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Dialog, DialogPanel } from '@headlessui/react';
import { useTranslations } from '@/lib/i18n';
import { useState, useCallback } from 'react';
import type { MenuEntry } from '@/lib/types';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { getContentDisplayText, getLocalizedContentValue } from '@/lib/content-presentation';

interface MenuItemDetailProps {
  item: (MenuEntry & { description?: string; image?: string; priceUnit?: string; frozen?: boolean }) | null;
  onClose: () => void;
  locale: string;
  /** When true, price is hidden — used in AI chat context where pricing should not be displayed. */
  hidePrice?: boolean;
}

// Sanitize rich text - only allow b, i, u tags
function sanitizeRichText(html: string): string {
  if (!html) return '';
  // First escape all HTML
  let safe = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Then restore only safe tags
  safe = safe
    .replace(/&lt;(\/?)b&gt;/gi, '<$1b>')
    .replace(/&lt;(\/?)i&gt;/gi, '<$1i>')
    .replace(/&lt;(\/?)u&gt;/gi, '<$1u>');
  return safe;
}

// Allergen identifier to display name mapping
const ALLERGEN_NAMES: Record<string, string> = {
  'Anidride-Solforosa-e-Solfiti': 'Solfiti',
  'Arachidi': 'Arachidi',
  'Crostacei': 'Crostacei',
  'Frutta-a-Guscio': 'Frutta Guscio',
  'Glutine': 'Glutine',
  'Latte-e-Derivati': 'Latte e D.',
  'Lupini': 'Lupini',
  'Molluschi': 'Molluschi',
  'Pesce': 'Pesce',
  'Sedano': 'Sedano',
  'Senape': 'Senape',
  'Sesamo': 'Sesamo',
  'Soia': 'Soia',
  'Uova': 'Uova',
};

export function MenuItemDetail({ item, onClose, locale, hidePrice }: MenuItemDetailProps) {
  const t = useTranslations();
  const restaurantId = useRestaurantStore((state) => state.data?.id);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  }, [onClose]);

  // Close modal on browser back button press
  useBackButtonClose(!!item, handleClose);

  const getDisplayText = (
    itemData: { name?: string; description?: string; desc?: string; i18n?: Record<string, Record<string, string>> },
    field: 'name' | 'description' = 'name'
  ) => getContentDisplayText({
    entity: itemData,
    field,
    locale,
    restaurantId,
  });

  const getLocalized = (
    itemData: { name?: string; description?: string; desc?: string; i18n?: Record<string, Record<string, string>> },
    field: 'name' | 'description' = 'name'
  ): string => getLocalizedContentValue(itemData, field, locale);

  const formatPrice = (price: number, priceUnit?: string): string => {
    const formatted = `€ ${price.toFixed(2).replace('.', ',')}`;
    if (priceUnit) {
      return `${formatted}/${priceUnit}`;
    }
    return formatted;
  };

  if (!item) return null;

  return (
    <Dialog
      as="div"
      className="relative z-50"
      open={!!item}
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

      {/* Content */}
      <div className="fixed inset-0 flex items-end justify-center pointer-events-none">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: isClosing ? '100%' : 0 }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300,
          }}
          className="w-full max-w-lg pointer-events-auto"
        >
          <DialogPanel className="relative bg-white rounded-t-3xl shadow-2xl min-h-[50vh] max-h-[85vh] overflow-y-auto">
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

            {/* Image */}
            {item.image && (
              <div className="relative w-full aspect-[4/3] bg-gray-200">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover rounded-t-3xl"
                  priority
                  unoptimized
                />
              </div>
            )}

            {/* Content */}
            <div className="p-6 pb-8">
              {/* Name and Price */}
              {(() => {
                const itemName = getDisplayText(item);

                return item.image ? (
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h2 className="text-2xl font-bold text-gray-800 flex-1">
                      <span className="block">{itemName.primary}</span>
                      {itemName.secondary && (
                        <span className="mt-1 block text-sm font-medium text-gray-500">
                          {itemName.secondary}
                        </span>
                      )}
                    </h2>
                    {!hidePrice && (
                      <span className="text-2xl font-bold text-primary whitespace-nowrap">
                        {formatPrice(item.price, item.priceUnit)}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                      <span className="block">{itemName.primary}</span>
                      {itemName.secondary && (
                        <span className="mt-1 block text-sm font-medium text-gray-500">
                          {itemName.secondary}
                        </span>
                      )}
                    </h2>
                    {!hidePrice && (
                      <div className="text-2xl font-bold text-primary mb-2">
                        {formatPrice(item.price, item.priceUnit)}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Allergens */}
              {item.allergens && item.allergens.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {item.allergens.map((allergen) => (
                      <Image
                        key={allergen}
                        src={`/images/allergeni-${allergen}.png`}
                        alt={ALLERGEN_NAMES[allergen] || allergen}
                        title={ALLERGEN_NAMES[allergen] || allergen}
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 italic">{t('allergyWarning')}</p>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <p
                  className="text-gray-600 mb-4 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichText(
                      getLocalized({ description: item.description, i18n: item.i18n }, 'description') || item.description
                    )
                  }}
                />
              )}

              {/* Frozen indicator */}
              {item.frozen && (
                <p className="text-sm text-gray-500 italic">
                  {t('frozenProduct')}
                </p>
              )}
            </div>
          </DialogPanel>
        </motion.div>
      </div>
    </Dialog>
  );
}
