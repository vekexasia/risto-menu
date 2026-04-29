'use client';

import Image from 'next/image';
import { CenteredModal } from '@/components/ui/Modal';
import type { PromotionAlert } from '@/lib/types';

interface PromotionPopupProps {
  promotion: PromotionAlert;
  open: boolean;
  onClose: () => void;
}

/** Returns true if the URL points to an image. */
function isImageUrl(url: string): boolean {
  return (
    /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url)
  );
}

/**
 * Promotional popup shown on app load when a valid promotion exists.
 * Matches the original Flutter promoDialog behaviour:
 *   - Image is displayed when url points to an image
 *   - "NON ORA" dismisses the popup
 *   - "VEDI" always opens promotion.url in a new tab (when url is set)
 */
export function PromotionPopup({ promotion, open, onClose }: PromotionPopupProps) {
  const hasImage = !!promotion.url && isImageUrl(promotion.url);

  const handleView = () => {
    if (promotion.url) {
      window.open(promotion.url, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title={promotion.title}
      showCloseButton={false}
      size="md"
    >
      {/* Promotional image */}
      {hasImage && (
        <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4 -mt-2">
          <Image
            src={promotion.url!}
            alt={promotion.title || 'Promozione'}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Content */}
      {promotion.content && (
        <p className="text-gray-700 text-sm leading-relaxed mb-6">
          {promotion.content}
        </p>
      )}

      {/* Buttons — always both shown (like Flutter's AlertDialog actions) */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-full bg-gray-500 text-white font-medium text-sm hover:bg-gray-600 transition-colors"
        >
          NON ORA
        </button>
        <button
          onClick={handleView}
          className="flex-1 py-3 rounded-full bg-primary text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          VEDI
        </button>
      </div>
    </CenteredModal>
  );
}
