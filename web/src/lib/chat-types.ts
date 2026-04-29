export interface ChatChoices {
  prompt: string;
  options: string[];
  mode: 'single' | 'multi';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  showItemIds?: string[];
  choices?: ChatChoices;
  /** Whether choices have been answered (prevents re-selection) */
  choicesAnswered?: boolean;
}

export interface ChatToolCall {
  name: string;
  params: Record<string, unknown>;
}

export type PanelState = 'closed' | 'minimized' | 'open';

export interface SSETextEvent {
  text: string;
}

export interface SSEToolCallEvent {
  name: string;
  params: Record<string, unknown>;
}

export interface SSEErrorEvent {
  message: string;
}
