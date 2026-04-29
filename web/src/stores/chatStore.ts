import { create } from 'zustand';
import type { ChatMessage, ChatChoices, PanelState } from '../lib/chat-types';

let nextId = 0;
function generateId(): string {
  return `msg_${Date.now()}_${nextId++}`;
}

interface ChatState {
  messages: ChatMessage[];
  panelState: PanelState;
  isStreaming: boolean;
  unreadCount: number;
  currentStreamId: string | null;

  addUserMessage: (content: string) => void;
  startAssistantMessage: () => string;
  appendToStream: (text: string) => void;
  addShowItems: (itemIds: string[]) => void;
  addChoices: (choices: ChatChoices) => void;
  markChoicesAnswered: (messageId: string) => void;
  finishStream: () => void;
  openPanel: () => void;
  closePanel: () => void;
  minimizePanel: () => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  panelState: 'closed',
  isStreaming: false,
  unreadCount: 0,
  currentStreamId: null,

  addUserMessage: (content: string) => {
    const msg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    set(state => ({ messages: [...state.messages, msg] }));
  },

  startAssistantMessage: () => {
    const id = generateId();
    const msg: ChatMessage = {
      id,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    set(state => ({
      messages: [...state.messages, msg],
      isStreaming: true,
      currentStreamId: id,
    }));
    return id;
  },

  appendToStream: (text: string) => {
    const streamId = get().currentStreamId;
    if (!streamId) return;
    set(state => ({
      messages: state.messages.map(m =>
        m.id === streamId ? { ...m, content: m.content + text } : m
      ),
      unreadCount: state.panelState !== 'open' ? state.unreadCount + 1 : state.unreadCount,
    }));
  },

  addShowItems: (itemIds: string[]) => {
    const streamId = get().currentStreamId;
    if (!streamId) return;
    set(state => ({
      messages: state.messages.map(m => {
        if (m.id !== streamId) return m;
        const existing = m.showItemIds || [];
        const merged = [...existing, ...itemIds.filter(id => !existing.includes(id))];
        return { ...m, showItemIds: merged };
      }),
    }));
  },

  addChoices: (choices: ChatChoices) => {
    const streamId = get().currentStreamId;
    if (!streamId) return;
    set(state => ({
      messages: state.messages.map(m =>
        m.id === streamId ? { ...m, choices } : m
      ),
    }));
  },

  markChoicesAnswered: (messageId: string) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === messageId ? { ...m, choicesAnswered: true } : m
      ),
    }));
  },

  finishStream: () => {
    set({ isStreaming: false, currentStreamId: null });
  },

  openPanel: () => set({ panelState: 'open', unreadCount: 0 }),
  closePanel: () => set({ panelState: 'closed' }),
  minimizePanel: () => set({ panelState: 'minimized' }),

  clearMessages: () => set({ messages: [], currentStreamId: null }),
}));

// Selectors
export const useChatMessages = () => useChatStore(s => s.messages);
export const useChatPanelState = () => useChatStore(s => s.panelState);
export const useIsChatStreaming = () => useChatStore(s => s.isStreaming);
export const useChatUnread = () => useChatStore(s => s.unreadCount);
