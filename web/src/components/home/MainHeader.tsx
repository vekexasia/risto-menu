'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { RestaurantData } from '@/lib/types';
import clsx from 'clsx';

interface MainHeaderProps {
  restaurant: RestaurantData;
  onSearch?: (query: string) => void;
}

/**
 * MainHeader component displays the restaurant hero section with:
 * - Header image that shrinks on scroll
 * - Restaurant name and payoff in an info card
 * - Search bar for filtering menu items
 *
 * Corresponds to MainPageHeaderDelegate in Flutter.
 */
export function MainHeader({ restaurant, onSearch }: MainHeaderProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate scroll progress for animations
  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = 150; // Max scroll distance for animation
      const currentScroll = window.scrollY;
      const progress = Math.min(1, Math.max(0, currentScroll / maxScroll));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch?.(searchQuery);
    },
    [searchQuery, onSearch]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  // Animation values based on scroll
  const headerHeight = `calc(${250 - scrollProgress * 100}px + env(safe-area-inset-top, 0px))`;
  const infoCardOpacity = 1 - scrollProgress;
  const infoCardScale = 1 - scrollProgress * 0.1;

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Background color fallback */}
      <div
        className="absolute inset-0 bg-white transition-all duration-200"
        style={{
          height: headerHeight,
        }}
      />

      {/* Hero Image */}
      <div
        className="relative w-full overflow-hidden transition-all duration-200"
        style={{
          height: headerHeight,
          minHeight: '64px',
        }}
      >
        {restaurant.headerImage && (
          <Image
            src={restaurant.headerImage}
            alt={`${restaurant.name} header`}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        )}

        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Info Card - Restaurant name, opening hours, info icons */}
      <div
        className="absolute left-3 right-3 transition-all duration-200"
        style={{
          bottom: `${56 + scrollProgress * 10}px`,
          opacity: infoCardOpacity,
          transform: `scale(${infoCardScale})`,
          pointerEvents: scrollProgress > 0.5 ? 'none' : 'auto',
        }}
      >
        <div className="mx-auto max-w-lg rounded-lg bg-white p-4 shadow-lg">
          <div className="flex flex-col items-center gap-3">
            {/* Restaurant Name */}
            <h1
              className="text-center text-2xl font-semibold tracking-wide text-primary md:text-3xl"
              style={{ fontFamily: restaurant.theme?.font || 'inherit' }}
            >
              {restaurant.name.toUpperCase()}
            </h1>

            {/* Payoff/Tagline */}
            {restaurant.payoff && (
              <p className="text-center text-sm text-gray-600">
                {restaurant.payoff}
              </p>
            )}

            {/* Info Icons Row */}
            <div className="flex items-center justify-center gap-6 text-gray-500">
              <button
                type="button"
                aria-label="Location"
                className="p-1 transition-colors hover:text-primary"
              >
                <MapPinIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Information"
                className="p-1 transition-colors hover:text-primary"
              >
                <InfoIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Call"
                className="p-1 transition-colors hover:text-primary"
              >
                <PhoneIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Opening Hours"
                className="p-1 transition-colors hover:text-primary"
              >
                <ClockIcon className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400">More information</p>
          </div>
        </div>
      </div>

      {/* Search Bar - Always visible at top when scrolled */}
      <div
        className={clsx(
          'absolute left-1/2 -translate-x-1/2 transition-all duration-200',
          scrollProgress > 0.3 ? 'top-3' : 'top-1/2 -translate-y-1/2'
        )}
        style={{
          top: scrollProgress > 0.3 ? '12px' : undefined,
        }}
      >
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="flex h-10 w-64 items-center overflow-hidden rounded-full bg-white shadow-md md:w-80">
            <SearchIcon className="ml-4 h-5 w-5 flex-shrink-0 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for a dish"
              className="h-full w-full border-none bg-transparent px-3 text-sm text-gray-700 placeholder-gray-400 outline-none"
              aria-label="Search menu"
            />
          </div>
        </form>
      </div>
    </header>
  );
}

// Icon components (inline for simplicity, could be extracted)
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
      />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

export default MainHeader;
