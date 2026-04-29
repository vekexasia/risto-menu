'use client';

import { type ReactNode } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title (optional) */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Additional CSS classes for the modal panel */
  className?: string;
  /** Whether to show the close button (default: true) */
  showCloseButton?: boolean;
}

/**
 * Bottom sheet modal component matching Flutter's DownLayer.
 * Slides up from the bottom and covers 80% of screen height.
 *
 * Uses @headlessui/react Dialog for accessibility and framer-motion for animations.
 *
 * @example
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <Modal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Select Options"
 * >
 *   <div>Modal content here</div>
 * </Modal>
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
}: ModalProps) {
  // Close modal on browser back button press
  useBackButtonClose(open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          as="div"
          className="relative z-50"
          open={open}
          onClose={onClose}
          static
        >
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50"
            aria-hidden="true"
          />

          {/* Modal container */}
          <div className="fixed inset-0 overflow-hidden">
            <div className="flex min-h-full items-end justify-center px-4">
              {/* Modal panel with slide-up animation */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{
                  type: 'spring',
                  damping: 25,
                  stiffness: 300,
                }}
              >
                <DialogPanel
                  className={cn(
                    // Size and position (80% of screen height like Flutter's DownLayer)
                    'relative w-full max-w-lg',
                    'h-[80vh]',
                    // Styling matching DownLayer
                    'bg-white',
                    'rounded-t-3xl',
                    'shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.25)]',
                    // Overflow handling
                    'flex flex-col',
                    className
                  )}
                >
                  {/* Close button (X) positioned like Flutter's DownLayer */}
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={cn(
                        'absolute right-4 top-5 z-10',
                        'rounded-full bg-black/10 p-1',
                        'text-black/45 transition-colors',
                        'hover:bg-black/20 hover:text-black/60',
                        'focus:outline-none focus-visible:ring-2',
                        'focus-visible:ring-[var(--color-primary,#cc9166)]'
                      )}
                      aria-label="Close modal"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Modal header with title */}
                  {title && (
                    <div className="flex-shrink-0 px-4 pt-5 pb-2">
                      <DialogTitle
                        className={cn(
                          'text-xl font-bold tracking-tight',
                          'text-[var(--color-primary,#cc9166)]'
                        )}
                      >
                        {title}
                      </DialogTitle>
                    </div>
                  )}

                  {/* Modal content with scroll */}
                  <div
                    className={cn(
                      'flex-1 overflow-y-auto',
                      'px-4 pb-6',
                      !title && 'pt-5'
                    )}
                  >
                    {children}
                  </div>
                </DialogPanel>
              </motion.div>
            </div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

/**
 * A simpler modal variant that centers content.
 * Useful for dialogs that don't need the full bottom sheet treatment.
 */
export interface CenteredModalProps extends Omit<ModalProps, 'className'> {
  /** Size of the modal */
  size?: 'sm' | 'md' | 'lg';
}

export function CenteredModal({
  open,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = 'md',
}: CenteredModalProps) {
  // Close modal on browser back button press
  useBackButtonClose(open, onClose);

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          as="div"
          className="relative z-50"
          open={open}
          onClose={onClose}
          static
        >
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50"
            aria-hidden="true"
          />

          {/* Modal container */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              {/* Centered modal panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <DialogPanel
                  className={cn(
                    'relative w-full',
                    sizeStyles[size],
                    'bg-white',
                    'rounded-2xl',
                    'shadow-xl',
                    'p-6'
                  )}
                >
                  {/* Close button */}
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={cn(
                        'absolute right-3 top-3',
                        'rounded-full bg-black/10 p-1',
                        'text-black/45 transition-colors',
                        'hover:bg-black/20 hover:text-black/60',
                        'focus:outline-none focus-visible:ring-2',
                        'focus-visible:ring-[var(--color-primary,#cc9166)]'
                      )}
                      aria-label="Close modal"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Title */}
                  {title && (
                    <DialogTitle
                      className={cn(
                        'text-xl font-bold tracking-tight mb-4',
                        'text-[var(--color-primary,#cc9166)]'
                      )}
                    >
                      {title}
                    </DialogTitle>
                  )}

                  {/* Content */}
                  {children}
                </DialogPanel>
              </motion.div>
            </div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
