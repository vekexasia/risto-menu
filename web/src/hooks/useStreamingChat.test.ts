import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useStreamingChat } from './useStreamingChat';
import { useChatStore } from '@/stores/chatStore';

function resetChatStore() {
  useChatStore.setState({
    messages: [],
    panelState: 'closed',
    isStreaming: false,
    unreadCount: 0,
    currentStreamId: null,
  });
  window.localStorage.clear();
}

function makeStream(sse: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sse));
      controller.close();
    },
  });
}

function mockChatFetch(sse: string) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.endsWith('/session')) {
      return Promise.resolve(new Response(
        JSON.stringify({ token: 'test-session-token', expiresAt: Math.floor(Date.now() / 1000) + 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ));
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      body: makeStream(sse),
      text: vi.fn(),
    });
  });
}

function mockChatErr(status: number, text: string) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.endsWith('/session')) {
      return Promise.resolve(new Response(
        JSON.stringify({ token: 'test-session-token', expiresAt: Math.floor(Date.now() / 1000) + 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ));
    }
    return Promise.resolve({ ok: false, status, text: vi.fn().mockResolvedValue(text) });
  });
}

describe('useStreamingChat', () => {
  beforeEach(resetChatStore);
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('only warms a session when already streaming, without sending a message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ token: 'test-session-token', expiresAt: Math.floor(Date.now() / 1000) + 3600 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )));
    useChatStore.setState({ isStreaming: true });

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/session');
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it('adds user message and starts assistant message on send', async () => {
    vi.stubGlobal('fetch', mockChatFetch('event: done\ndata: {}\n\n'));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => {
      await result.current.sendMessage('ciao');
    });

    const msgs = useChatStore.getState().messages;
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('ciao');
    expect(msgs[1].role).toBe('assistant');
    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it('appends text from SSE text events', async () => {
    const sse = [
      'event: text\ndata: {"text":"Hello"}\n\n',
      'event: text\ndata: {"text":" world"}\n\n',
      'event: done\ndata: {}\n\n',
    ].join('');
    vi.stubGlobal('fetch', mockChatFetch(sse));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => { await result.current.sendMessage('hi'); });

    const assistantMsg = useChatStore.getState().messages.find(m => m.role === 'assistant');
    expect(assistantMsg?.content).toBe('Hello world');
  });

  it('handles show_items tool call', async () => {
    const sse = [
      'event: tool_call\ndata: {"name":"show_items","params":{"item_ids":["a","b"]}}\n\n',
      'event: done\ndata: {}\n\n',
    ].join('');
    vi.stubGlobal('fetch', mockChatFetch(sse));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => { await result.current.sendMessage('show me something'); });

    const assistantMsg = useChatStore.getState().messages.find(m => m.role === 'assistant');
    expect(assistantMsg?.showItemIds).toEqual(['a', 'b']);
  });

  it('handles show_choices tool call', async () => {
    const sse = [
      'event: tool_call\ndata: {"name":"show_choices","params":{"prompt":"Pick","choices":["A","B"],"mode":"single"}}\n\n',
      'event: done\ndata: {}\n\n',
    ].join('');
    vi.stubGlobal('fetch', mockChatFetch(sse));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => { await result.current.sendMessage('help me choose'); });

    const assistantMsg = useChatStore.getState().messages.find(m => m.role === 'assistant');
    expect(assistantMsg?.choices?.prompt).toBe('Pick');
    expect(assistantMsg?.choices?.options).toEqual(['A', 'B']);
  });

  it('handles SSE error event', async () => {
    vi.stubGlobal('fetch', mockChatFetch('event: error\ndata: {"message":"Something went wrong"}\n\n'));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => { await result.current.sendMessage('hi'); });

    const assistantMsg = useChatStore.getState().messages.find(m => m.role === 'assistant');
    expect(assistantMsg?.content).toContain('Something went wrong');
    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it('handles HTTP error response', async () => {
    vi.stubGlobal('fetch', mockChatErr(500, 'Internal Server Error'));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => { await result.current.sendMessage('hi'); });

    const assistantMsg = useChatStore.getState().messages.find(m => m.role === 'assistant');
    expect(assistantMsg?.content).toContain('Non riesco a rispondere ora');
    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it('cancel() aborts in-flight chat request', async () => {
    const neverResolves = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/session')) {
        return Promise.resolve(new Response(
          JSON.stringify({ token: 'test-session-token', expiresAt: Math.floor(Date.now() / 1000) + 3600 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ));
      }
      return new Promise(() => {});
    });
    vi.stubGlobal('fetch', neverResolves);

    const { result } = renderHook(() => useStreamingChat('it'));
    act(() => { result.current.sendMessage('slow'); });
    await act(async () => { result.current.cancel(); });

    expect(neverResolves).toHaveBeenCalled();
  });

  it('handles malformed SSE JSON gracefully', async () => {
    vi.stubGlobal('fetch', mockChatFetch('event: text\ndata: {not valid json}\n\nevent: done\ndata: {}\n\n'));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => { await result.current.sendMessage('hi'); });

    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it('handles response with no body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/session')) {
        return Promise.resolve(new Response(
          JSON.stringify({ token: 'test-session-token', expiresAt: Math.floor(Date.now() / 1000) + 3600 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ));
      }
      return Promise.resolve({ ok: true, status: 200, body: null, text: vi.fn() });
    }));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => { await result.current.sendMessage('hi'); });

    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it('handles fetch network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => { await result.current.sendMessage('hi'); });

    const assistantMsg = useChatStore.getState().messages.find(m => m.role === 'assistant');
    expect(assistantMsg?.content).toContain('Non riesco a rispondere ora');
    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it('finishes stream when stream ends without an explicit done event', async () => {
    vi.stubGlobal('fetch', mockChatFetch('event: text\ndata: {"text":"Hello"}\n\n'));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => { await result.current.sendMessage('hi'); });

    expect(useChatStore.getState().isStreaming).toBe(false);
    const assistantMsg = useChatStore.getState().messages.find(m => m.role === 'assistant');
    expect(assistantMsg?.content).toBe('Hello');
  });

  it('dispatches other tool calls to chatActionsStore', async () => {
    const sse = [
      'event: tool_call\ndata: {"name":"scroll_to_category","params":{"category_id":"cat1"}}\n\n',
      'event: done\ndata: {}\n\n',
    ].join('');
    vi.stubGlobal('fetch', mockChatFetch(sse));

    const { result } = renderHook(() => useStreamingChat('it'));
    await act(async () => { await result.current.sendMessage('scroll to pasta'); });

    const { useChatActionsStore } = await import('@/stores/chatActionsStore');
    expect(useChatActionsStore.getState().scrollToCategoryId).toBe('cat1');
  });
});
