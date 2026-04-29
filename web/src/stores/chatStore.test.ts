import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';

function resetStore() {
  useChatStore.setState({
    messages: [],
    panelState: 'closed',
    isStreaming: false,
    unreadCount: 0,
    currentStreamId: null,
  });
}

describe('chatStore', () => {
  beforeEach(resetStore);

  // ── Panel state ──────────────────────────────────────────────────────

  it('opens panel and clears unread count', () => {
    useChatStore.setState({ unreadCount: 3 });
    useChatStore.getState().openPanel();
    const s = useChatStore.getState();
    expect(s.panelState).toBe('open');
    expect(s.unreadCount).toBe(0);
  });

  it('closes panel', () => {
    useChatStore.getState().openPanel();
    useChatStore.getState().closePanel();
    expect(useChatStore.getState().panelState).toBe('closed');
  });

  it('minimizes panel', () => {
    useChatStore.getState().openPanel();
    useChatStore.getState().minimizePanel();
    expect(useChatStore.getState().panelState).toBe('minimized');
  });

  // ── Messages ─────────────────────────────────────────────────────────

  it('addUserMessage appends a user message', () => {
    useChatStore.getState().addUserMessage('hello');
    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('hello');
    expect(msgs[0].id).toMatch(/^msg_/);
  });

  it('startAssistantMessage creates empty assistant message and returns its id', () => {
    const id = useChatStore.getState().startAssistantMessage();
    const s = useChatStore.getState();
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].role).toBe('assistant');
    expect(s.messages[0].content).toBe('');
    expect(s.isStreaming).toBe(true);
    expect(s.currentStreamId).toBe(id);
  });

  it('appendToStream appends text to current assistant message', () => {
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().appendToStream('hello');
    useChatStore.getState().appendToStream(' world');
    expect(useChatStore.getState().messages[0].content).toBe('hello world');
  });

  it('appendToStream increments unreadCount when panel is not open', () => {
    useChatStore.setState({ panelState: 'closed' });
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().appendToStream('ping');
    expect(useChatStore.getState().unreadCount).toBe(1);
  });

  it('appendToStream does not increment unreadCount when panel is open', () => {
    useChatStore.setState({ panelState: 'open' });
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().appendToStream('ping');
    expect(useChatStore.getState().unreadCount).toBe(0);
  });

  it('appendToStream is a no-op when there is no currentStreamId', () => {
    useChatStore.getState().addUserMessage('hi');
    useChatStore.getState().appendToStream('should not append');
    expect(useChatStore.getState().messages[0].content).toBe('hi');
  });

  it('finishStream clears isStreaming and currentStreamId', () => {
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().finishStream();
    const s = useChatStore.getState();
    expect(s.isStreaming).toBe(false);
    expect(s.currentStreamId).toBeNull();
  });

  it('clearMessages resets messages and currentStreamId', () => {
    useChatStore.getState().addUserMessage('hi');
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().clearMessages();
    const s = useChatStore.getState();
    expect(s.messages).toHaveLength(0);
    expect(s.currentStreamId).toBeNull();
  });

  // ── addShowItems ──────────────────────────────────────────────────────

  it('addShowItems attaches item ids to current streaming message', () => {
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().addShowItems(['a', 'b']);
    expect(useChatStore.getState().messages[0].showItemIds).toEqual(['a', 'b']);
  });

  it('addShowItems deduplicates item ids', () => {
    useChatStore.getState().startAssistantMessage();
    useChatStore.getState().addShowItems(['a', 'b']);
    useChatStore.getState().addShowItems(['b', 'c']);
    expect(useChatStore.getState().messages[0].showItemIds).toEqual(['a', 'b', 'c']);
  });

  it('addShowItems is a no-op when there is no currentStreamId', () => {
    useChatStore.getState().addUserMessage('hi');
    useChatStore.getState().addShowItems(['x']);
    expect(useChatStore.getState().messages[0].showItemIds).toBeUndefined();
  });

  // ── addChoices / markChoicesAnswered ──────────────────────────────────

  it('addChoices attaches choices to current streaming message', () => {
    useChatStore.getState().startAssistantMessage();
    const choices = { prompt: 'Pick one', options: ['A', 'B'], mode: 'single' as const };
    useChatStore.getState().addChoices(choices);
    expect(useChatStore.getState().messages[0].choices).toEqual(choices);
  });

  it('addChoices is a no-op when there is no currentStreamId', () => {
    useChatStore.getState().addUserMessage('hi');
    useChatStore.getState().addChoices({ prompt: 'Q', options: ['A'], mode: 'single' });
    expect(useChatStore.getState().messages[0].choices).toBeUndefined();
  });

  it('markChoicesAnswered sets choicesAnswered on the target message', () => {
    useChatStore.getState().addUserMessage('hi');
    const id = useChatStore.getState().messages[0].id;
    useChatStore.getState().markChoicesAnswered(id);
    expect(useChatStore.getState().messages[0].choicesAnswered).toBe(true);
  });

  it('markChoicesAnswered does not affect other messages', () => {
    useChatStore.getState().addUserMessage('first');
    useChatStore.getState().addUserMessage('second');
    const id = useChatStore.getState().messages[0].id;
    useChatStore.getState().markChoicesAnswered(id);
    expect(useChatStore.getState().messages[1].choicesAnswered).toBeUndefined();
  });
});
