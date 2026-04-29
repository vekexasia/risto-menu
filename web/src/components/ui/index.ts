/**
 * UI Components barrel export.
 * Re-exports all common UI components for convenient imports.
 *
 * @example
 * import { Button, Modal, NoticeBox } from '@/components/ui';
 */

// Button components
export { Button } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';

// Modal components
export { Modal, CenteredModal } from './Modal';
export type { ModalProps, CenteredModalProps } from './Modal';

// Notice box components
export { NoticeBox, NoticeBoxWithVariant } from './NoticeBox';
export type {
  NoticeBoxProps,
  NoticeBoxWithVariantProps,
  NoticeVariant,
} from './NoticeBox';
