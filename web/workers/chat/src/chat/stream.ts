import type { ChatToolCall } from '../types';

export function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function encodeTextEvent(text: string): string {
  return encodeSSE('text', { text });
}

export function encodeToolCallEvent(toolCall: ChatToolCall): string {
  return encodeSSE('tool_call', toolCall);
}

export function encodeDoneEvent(): string {
  return encodeSSE('done', {});
}

export function encodeErrorEvent(message: string): string {
  return encodeSSE('error', { message });
}

export function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };
}
