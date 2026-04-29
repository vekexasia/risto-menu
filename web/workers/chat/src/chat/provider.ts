import type { ChatMessage, ToolDefinition, ChatToolCall, Env } from '../types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';

export interface LLMProvider {
  chat(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
    onText: (text: string) => void;
    onToolCall: (call: ChatToolCall) => void;
    /** Resolves server-side tools. Returns JSON string result, or null for client-side tools. */
    resolveServerTool?: (call: ChatToolCall) => string | null;
  }): Promise<void>;
}

export function createProvider(env: Env): LLMProvider {
  const providerName = (env.LLM_PROVIDER || 'anthropic').toLowerCase();

  if (providerName === 'openai') {
    return new OpenAIProvider(env.OPENAI_API_KEY, env.LLM_MODEL || 'gpt-5.4-mini');
  }

  return new AnthropicProvider(env.ANTHROPIC_API_KEY, env.LLM_MODEL || 'claude-haiku-4-5-20251001');
}
