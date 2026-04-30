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

class WorkersAIProvider implements LLMProvider {
  constructor(private ai: Ai, private model: string) {}

  async chat(params: Parameters<LLMProvider['chat']>[0]): Promise<void> {
    const result = await this.ai.run(this.model, {
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages,
      ],
      max_tokens: 700,
      temperature: 0.4,
    });
    const text = typeof result.response === 'string' ? result.response : JSON.stringify(result);
    params.onText(text);
  }
}

export function createProvider(env: Env): LLMProvider {
  const providerName = (env.LLM_PROVIDER || 'anthropic').toLowerCase();

  if (providerName === 'workers-ai') {
    if (!env.AI) throw new Error('Workers AI binding is not configured');
    return new WorkersAIProvider(env.AI, env.LLM_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  }

  if (providerName === 'openai') {
    return new OpenAIProvider(env.OPENAI_API_KEY, env.LLM_MODEL || 'gpt-5.4-mini');
  }

  return new AnthropicProvider(env.ANTHROPIC_API_KEY, env.LLM_MODEL || 'claude-haiku-4-5-20251001');
}
