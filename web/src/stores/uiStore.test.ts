import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUIStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have null visibleCategory', () => {
      const state = useUIStore.getState();
      expect(state.visibleCategory).toBeNull();
    });

    it('should have empty searchQuery', () => {
      const state = useUIStore.getState();
      expect(state.searchQuery).toBe('');
    });
  });

  describe('setVisibleCategory', () => {
    it('should set visibleCategory to a category ID', () => {
      const { setVisibleCategory } = useUIStore.getState();
      setVisibleCategory('category-1');
      expect(useUIStore.getState().visibleCategory).toBe('category-1');
    });

    it('should set visibleCategory to null', () => {
      const { setVisibleCategory } = useUIStore.getState();
      setVisibleCategory('category-1');
      setVisibleCategory(null);
      expect(useUIStore.getState().visibleCategory).toBeNull();
    });

    it('should update visibleCategory when changing categories', () => {
      const { setVisibleCategory } = useUIStore.getState();
      setVisibleCategory('category-1');
      expect(useUIStore.getState().visibleCategory).toBe('category-1');

      setVisibleCategory('category-2');
      expect(useUIStore.getState().visibleCategory).toBe('category-2');
    });
  });

  describe('setSearchQuery', () => {
    it('should set searchQuery', () => {
      const { setSearchQuery } = useUIStore.getState();
      setSearchQuery('pizza');
      expect(useUIStore.getState().searchQuery).toBe('pizza');
    });

    it('should allow empty searchQuery', () => {
      const { setSearchQuery } = useUIStore.getState();
      setSearchQuery('pizza');
      setSearchQuery('');
      expect(useUIStore.getState().searchQuery).toBe('');
    });

    it('should preserve whitespace in searchQuery', () => {
      const { setSearchQuery } = useUIStore.getState();
      setSearchQuery('  pizza  ');
      expect(useUIStore.getState().searchQuery).toBe('  pizza  ');
    });
  });

  describe('clearSearch', () => {
    it('should clear searchQuery to empty string', () => {
      const { setSearchQuery, clearSearch } = useUIStore.getState();
      setSearchQuery('pizza');
      expect(useUIStore.getState().searchQuery).toBe('pizza');

      clearSearch();
      expect(useUIStore.getState().searchQuery).toBe('');
    });
  });

  describe('reset', () => {
    it('should reset visibleCategory to null', () => {
      const { setVisibleCategory, reset } = useUIStore.getState();
      setVisibleCategory('category-1');
      reset();
      expect(useUIStore.getState().visibleCategory).toBeNull();
    });

    it('should reset searchQuery to empty string', () => {
      const { setSearchQuery, reset } = useUIStore.getState();
      setSearchQuery('pizza');
      reset();
      expect(useUIStore.getState().searchQuery).toBe('');
    });

    it('should reset all state at once', () => {
      const { setVisibleCategory, setSearchQuery, reset } = useUIStore.getState();
      setVisibleCategory('category-1');
      setSearchQuery('pizza');

      reset();

      const state = useUIStore.getState();
      expect(state.visibleCategory).toBeNull();
      expect(state.searchQuery).toBe('');
    });
  });
});
