'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Button variants matching the Flutter app's styling.
 * - primary: Filled button with primary color background
 * - secondary: Outlined button with primary color border
 * - danger: Outlined button with red color (like RedButton.dart)
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: ButtonVariant;
  /** Icon to display on the left side */
  leftIcon?: ReactNode;
  /** Text to display on the right side (e.g., price) */
  rightText?: string;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Button content/title */
  children: ReactNode;
}

/**
 * Restaurant button component matching Flutter's RestaurantButton.
 * Supports left icon, title, and optional right text (like price display).
 *
 * Uses CSS variable --color-primary for theming.
 * The primary color should be set on a parent element or :root.
 *
 * @example
 * // Primary button with icon
 * <Button leftIcon={<ShoppingCart />}>Add to Cart</Button>
 *
 * // Button with right text (price)
 * <Button leftIcon={<Pizza />} rightText="12,50 €">Margherita</Button>
 *
 * // Danger/outlined button
 * <Button variant="danger">Remove</Button>
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      leftIcon,
      rightText,
      loading = false,
      disabled = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseStyles = cn(
      // Base layout and sizing
      'relative inline-flex w-full items-center justify-center gap-2',
      'rounded-full px-4 py-2.5',
      'font-semibold text-lg tracking-tight',
      // Transition
      'transition-all duration-200 ease-in-out',
      // Focus styles
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      // Disabled styles
      isDisabled && 'cursor-not-allowed opacity-50'
    );

    const variantStyles: Record<ButtonVariant, string> = {
      primary: cn(
        // Primary filled button (like RawButton.dart)
        'bg-[var(--color-primary,#cc9166)] text-white',
        !isDisabled && 'hover:bg-[var(--color-primary-dark,#b87f52)] active:scale-[0.98]',
        'focus-visible:ring-[var(--color-primary,#cc9166)]'
      ),
      secondary: cn(
        // Secondary outlined button
        'border-2 border-[var(--color-primary,#cc9166)]',
        'bg-transparent text-[var(--color-primary,#cc9166)]',
        !isDisabled && 'hover:bg-[var(--color-primary-light,#f5ebe4)] active:scale-[0.98]',
        'focus-visible:ring-[var(--color-primary,#cc9166)]'
      ),
      danger: cn(
        // Danger/red outlined button (like RedButton.dart / OutlinedButton)
        'border-2 border-red-500',
        'bg-transparent text-red-500',
        'px-3 py-1 text-base',
        !isDisabled && 'hover:bg-red-50 active:scale-[0.98]',
        'focus-visible:ring-red-500'
      ),
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(baseStyles, variantStyles[variant], className)}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <span className="absolute left-4">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}

        {/* Left icon */}
        {leftIcon && !loading && (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        {/* Title/children */}
        <span className={cn('flex-1 text-left', loading && 'invisible')}>
          {children}
        </span>

        {/* Right text (e.g., price) */}
        {rightText && (
          <span className="flex-shrink-0 text-xl font-bold">
            {rightText}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
