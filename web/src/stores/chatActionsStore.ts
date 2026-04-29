import { create } from 'zustand';

interface ChatActionsState {
  scrollToCategoryId: string | null;
  openItemDetail: { itemId: string } | null;
  filterCriteria: { excludeAllergens?: string[]; searchQuery?: string } | null;

  requestScrollToCategory: (categoryId: string) => void;
  consumeScrollRequest: () => void;
  requestOpenItemDetail: (itemId: string) => void;
  consumeOpenItemDetailRequest: () => void;
  setFilterCriteria: (criteria: { excludeAllergens?: string[]; searchQuery?: string } | null) => void;
  clearFilter: () => void;
  dispatch: (toolCall: { name: string; params: Record<string, unknown> }) => void;
}

export const useChatActionsStore = create<ChatActionsState>((set) => ({
  scrollToCategoryId: null,
  openItemDetail: null,
  filterCriteria: null,

  requestScrollToCategory: (categoryId) => set({ scrollToCategoryId: categoryId }),
  consumeScrollRequest: () => set({ scrollToCategoryId: null }),
  requestOpenItemDetail: (itemId) => set({ openItemDetail: { itemId } }),
  consumeOpenItemDetailRequest: () => set({ openItemDetail: null }),
  setFilterCriteria: (criteria) => set({ filterCriteria: criteria }),
  clearFilter: () => set({ filterCriteria: null }),

  dispatch: (toolCall) => {
    const { name, params } = toolCall;
    switch (name) {
      case 'scroll_to_category':
        set({ scrollToCategoryId: params.category_id as string });
        break;
      // show_items is handled in useStreamingChat via chatStore.addShowItems
      case 'filter_menu':
        set({
          filterCriteria: {
            excludeAllergens: params.exclude_allergens as string[] | undefined,
            searchQuery: params.search_query as string | undefined,
          },
        });
        break;
    }
  },
}));

// Selectors
export const useScrollToCategoryId = () => useChatActionsStore(s => s.scrollToCategoryId);
export const useOpenItemDetail = () => useChatActionsStore(s => s.openItemDetail);
export const useChatFilterCriteria = () => useChatActionsStore(s => s.filterCriteria);
