import { describe, it, expect, beforeEach } from 'vitest';
import { useChatActionsStore } from './chatActionsStore';

describe('chatActionsStore', () => {
  beforeEach(() => {
    // Reset store
    useChatActionsStore.setState({
      scrollToCategoryId: null,
      openItemDetail: null,
      filterCriteria: null,
    });
  });

  it('dispatch scroll_to_category sets scrollToCategoryId', () => {
    useChatActionsStore.getState().dispatch({
      name: 'scroll_to_category',
      params: { category_id: 'cat-123' },
    });

    expect(useChatActionsStore.getState().scrollToCategoryId).toBe('cat-123');
  });

  it('dispatch filter_menu sets filterCriteria', () => {
    useChatActionsStore.getState().dispatch({
      name: 'filter_menu',
      params: { exclude_allergens: ['Glutine', 'Latte-e-Derivati'] },
    });

    expect(useChatActionsStore.getState().filterCriteria).toEqual({
      excludeAllergens: ['Glutine', 'Latte-e-Derivati'],
      searchQuery: undefined,
    });
  });

  it('consumeScrollRequest clears scrollToCategoryId', () => {
    useChatActionsStore.getState().requestScrollToCategory('cat-1');
    expect(useChatActionsStore.getState().scrollToCategoryId).toBe('cat-1');

    useChatActionsStore.getState().consumeScrollRequest();
    expect(useChatActionsStore.getState().scrollToCategoryId).toBeNull();
  });

  it('clearFilter clears filterCriteria', () => {
    useChatActionsStore.getState().setFilterCriteria({ excludeAllergens: ['Glutine'] });
    useChatActionsStore.getState().clearFilter();
    expect(useChatActionsStore.getState().filterCriteria).toBeNull();
  });
});
