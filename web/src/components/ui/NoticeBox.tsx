'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface NoticeBoxProps {
  /** Content to display inside the notice box */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** External padding around the box (in Tailwind spacing units) */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Notice box component matching Flutter's NoticeBox.
 * Displays informational content with a light primary color background.
 *
 * Uses CSS variable --color-primary-light for theming.
 *
 * @example
 * <NoticeBox>
 *   Orders placed after 10 PM will be prepared the next day.
 * </NoticeBox>
 *
 * <NoticeBox padding="md">
 *   <p>Important information here</p>
 * </NoticeBox>
 */
export function NoticeBox({
  children,
  className,
  padding = 'none',
}: NoticeBoxProps) {
  const paddingStyles = {
    none: '',
    sm: 'mx-2 my-2',
    md: 'mx-4 my-4',
    lg: 'mx-6 my-6',
  };

  return (
    <div className={cn(paddingStyles[padding], className)}>
      <div
        className={cn(
          // Background color using CSS variable for primary-light
          'bg-[var(--color-primary-light,#f5ebe4)]',
          // Internal padding matching Flutter's EdgeInsets.all(16)
          'p-4',
          // Text styling
          'text-base text-gray-800'
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Variant notice types for different contexts.
 */
export type NoticeVariant = 'info' | 'warning' | 'success' | 'error';

export interface NoticeBoxWithVariantProps extends NoticeBoxProps {
  /** Visual style variant */
  variant?: NoticeVariant;
  /** Optional icon to display */
  icon?: ReactNode;
}

/**
 * Extended NoticeBox with variant support for different message types.
 * Provides predefined color schemes for info, warning, success, and error states.
 *
 * @example
 * <NoticeBoxWithVariant variant="warning">
 *   This item contains allergens.
 * </NoticeBoxWithVariant>
 */
export function NoticeBoxWithVariant({
  children,
  className,
  padding = 'none',
  variant = 'info',
  icon,
}: NoticeBoxWithVariantProps) {
  const paddingStyles = {
    none: '',
    sm: 'mx-2 my-2',
    md: 'mx-4 my-4',
    lg: 'mx-6 my-6',
  };

  const variantStyles: Record<NoticeVariant, string> = {
    info: 'bg-[var(--color-primary-light,#f5ebe4)] text-gray-800',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    success: 'bg-green-50 text-green-800 border border-green-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
  };

  return (
    <div className={cn(paddingStyles[padding], className)}>
      <div
        className={cn(
          'p-4 rounded-lg',
          variantStyles[variant],
          icon && 'flex items-start gap-3'
        )}
        role={variant === 'error' ? 'alert' : 'status'}
      >
        {icon && (
          <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="text-base">{children}</div>
      </div>
    </div>
  );
}
