import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuSelection } from '../lib/types';

interface MenuSelectionState {
  // State
  selection: MenuSelection | null;

  // Actions
  setSelection: (selection: MenuSelection) => void;
  reset: () => void;

  // Helpers
  isSeated: () => boolean;
  isTakeaway: () => boolean;
  toIdentifier: () => 'seated' | 'takeaway' | null;
}

export const useMenuSelectionStore = create<MenuSelectionState>()(
  persist(
    (set, get) => ({
      selection: null,

      setSelection: (selection: MenuSelection) => {
        set({ selection });
      },

      reset: () => {
        set({ selection: null });
      },

      isSeated: () => get().selection === 'SEATED',

      isTakeaway: () => get().selection === 'TAKEAWAY',

      toIdentifier: () => {
        const selection = get().selection;
        if (selection === 'SEATED') return 'seated';
        if (selection === 'TAKEAWAY') return 'takeaway';
        return null;
      },
    }),
    {
      name: 'menu-selection-storage',
    }
  )
);

// Selector hooks
export const useSelection = () => useMenuSelectionStore((state) => state.selection);
export const useIsSeated = () => useMenuSelectionStore((state) => state.selection === 'SEATED');
export const useIsTakeaway = () => useMenuSelectionStore((state) => state.selection === 'TAKEAWAY');
export const useHasSelection = () => useMenuSelectionStore((state) => state.selection !== null);
