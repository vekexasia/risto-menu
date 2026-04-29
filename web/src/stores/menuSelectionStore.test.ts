import { describe, it, expect, beforeEach } from 'vitest';
import { useMenuSelectionStore } from './menuSelectionStore';

describe('menuSelectionStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useMenuSelectionStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have null as initial selection', () => {
      const state = useMenuSelectionStore.getState();
      expect(state.selection).toBeNull();
    });
  });

  describe('setSelection', () => {
    it('should set selection to SEATED', () => {
      const { setSelection } = useMenuSelectionStore.getState();
      setSelection('SEATED');
      expect(useMenuSelectionStore.getState().selection).toBe('SEATED');
    });

    it('should set selection to TAKEAWAY', () => {
      const { setSelection } = useMenuSelectionStore.getState();
      setSelection('TAKEAWAY');
      expect(useMenuSelectionStore.getState().selection).toBe('TAKEAWAY');
    });

    it('should allow toggling between SEATED and TAKEAWAY', () => {
      const { setSelection } = useMenuSelectionStore.getState();

      setSelection('SEATED');
      expect(useMenuSelectionStore.getState().selection).toBe('SEATED');

      setSelection('TAKEAWAY');
      expect(useMenuSelectionStore.getState().selection).toBe('TAKEAWAY');

      setSelection('SEATED');
      expect(useMenuSelectionStore.getState().selection).toBe('SEATED');
    });
  });

  describe('reset', () => {
    it('should reset selection to null', () => {
      const { setSelection, reset } = useMenuSelectionStore.getState();

      setSelection('SEATED');
      expect(useMenuSelectionStore.getState().selection).toBe('SEATED');

      reset();
      expect(useMenuSelectionStore.getState().selection).toBeNull();
    });
  });

  describe('helper methods', () => {
    describe('isSeated', () => {
      it('should return true when selection is SEATED', () => {
        const { setSelection, isSeated } = useMenuSelectionStore.getState();
        setSelection('SEATED');
        expect(isSeated()).toBe(true);
      });

      it('should return false when selection is TAKEAWAY', () => {
        const { setSelection, isSeated } = useMenuSelectionStore.getState();
        setSelection('TAKEAWAY');
        expect(isSeated()).toBe(false);
      });

      it('should return false when selection is null', () => {
        const { isSeated } = useMenuSelectionStore.getState();
        expect(isSeated()).toBe(false);
      });
    });

    describe('isTakeaway', () => {
      it('should return true when selection is TAKEAWAY', () => {
        const { setSelection, isTakeaway } = useMenuSelectionStore.getState();
        setSelection('TAKEAWAY');
        expect(isTakeaway()).toBe(true);
      });

      it('should return false when selection is SEATED', () => {
        const { setSelection, isTakeaway } = useMenuSelectionStore.getState();
        setSelection('SEATED');
        expect(isTakeaway()).toBe(false);
      });

      it('should return false when selection is null', () => {
        const { isTakeaway } = useMenuSelectionStore.getState();
        expect(isTakeaway()).toBe(false);
      });
    });

    describe('toIdentifier', () => {
      it('should return "seated" when selection is SEATED', () => {
        const { setSelection, toIdentifier } = useMenuSelectionStore.getState();
        setSelection('SEATED');
        expect(toIdentifier()).toBe('seated');
      });

      it('should return "takeaway" when selection is TAKEAWAY', () => {
        const { setSelection, toIdentifier } = useMenuSelectionStore.getState();
        setSelection('TAKEAWAY');
        expect(toIdentifier()).toBe('takeaway');
      });

      it('should return null when selection is null', () => {
        const { toIdentifier } = useMenuSelectionStore.getState();
        expect(toIdentifier()).toBeNull();
      });
    });
  });
});
