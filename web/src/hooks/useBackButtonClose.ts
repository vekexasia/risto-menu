'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook that closes a modal when the browser back button is pressed.
 *
 * When the modal opens, it pushes a new history state.
 * When the back button is pressed, it triggers onClose.
 * When the modal closes normally, it pops the history state.
 *
 * @param open - Whether the modal is currently open
 * @param onClose - Callback to close the modal
 */
export function useBackButtonClose(open: boolean, onClose: () => void) {
  const hasAddedHistoryRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Keep onClose ref up to date
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open && !hasAddedHistoryRef.current) {
      // Push a new history state when modal opens
      window.history.pushState({ modal: true }, '');
      hasAddedHistoryRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      // When modal is closed (by any means), clean up history if we added it
      if (hasAddedHistoryRef.current) {
        hasAddedHistoryRef.current = false;
        // Go back to remove the state we added
        window.history.back();
      }
      return;
    }

    const handlePopState = () => {
      // Back button pressed while modal is open
      if (hasAddedHistoryRef.current) {
        hasAddedHistoryRef.current = false;
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [open]);
}
