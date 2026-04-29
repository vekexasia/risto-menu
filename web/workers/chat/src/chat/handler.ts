import type { Env, ChatRequest, ChatToolCall, MenuDataCache } from '../types';
import { getMenuData } from '../menu/cache';
import { buildSystemPrompt } from './system-prompt';
import { TOOLS } from './tools';
import { createProvider } from './provider';
import { encodeTextEvent, encodeToolCallEvent, encodeDoneEvent, encodeErrorEvent, sseHeaders } from './stream';
import { getItemDetail, searchByAllergens } from '../menu/serialize';
import { checkMenuForChat } from '../middleware/menu-guard';
import { checkIpRateLimit, checkSessionRateLimit } from '../middleware/rate-limit';
import type { ChatSession } from '../middleware/session';

const MAX_MESSAGES = 20;

export async function handleChat(request: Request, env: Env, corsHeaders: Record<string, string>, session: ChatSession, ctx: ExecutionContext): Promise<Response> {
  const startTime = Date.now();
  const sessionId = crypto.randomUUID();
  const ip = request.headers.get('cf-connecting-ip') || 'local';

  let body: ChatRequest;
  try {
    body = await request.json() as ChatRequest;
  } catch {
    console.log(`[CHAT] ${ip} | BAD REQUEST: invalid JSON`);
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { messages, locale = 'en' } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.log(`[CHAT] ${ip} | BAD REQUEST: no messages`);
    return new Response(JSON.stringify({ error: 'messages is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const ipLimitResp = checkIpRateLimit(ip);
  if (ipLimitResp) {
    return new Response(ipLimitResp.body, {
      status: ipLimitResp.status,
      headers: { ...Object.fromEntries(ipLimitResp.headers.entries()), ...corsHeaders },
    });
  }

  const sessionLimitResp = checkSessionRateLimit(session.sid);
  if (sessionLimitResp) {
    return new Response(sessionLimitResp.body, {
      status: sessionLimitResp.status,
      headers: { ...Object.fromEntries(sessionLimitResp.headers.entries()), ...corsHeaders },
    });
  }

  // Menu guard: ensure menu is published and chat is enabled
  const guardResult = await checkMenuForChat(env.DB);
  if (guardResult === 'draft') {
    console.log(`[CHAT] ${ip} | BLOCKED: menu draft`);
    return new Response(JSON.stringify({ error: 'Menu not available' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (guardResult === 'chat_disabled') {
    console.log(`[CHAT] ${ip} | BLOCKED: chat disabled`);
    return new Response(JSON.stringify({ error: 'Chat not available' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '(empty)';

  // Limit message history
  const trimmedMessages = messages.slice(-MAX_MESSAGES);

  // Detect user's language from conversation and inject explicit directive.
  // Short messages (e.g. clicked choices like "Main courses") aren't enough
  // for the model to detect language — we analyze the full conversation.
  const userLang = detectUserLanguage(trimmedMessages);
  console.log(`[CHAT] ${ip} | sid=${session.sid.slice(0, 8)}… | locale=${locale} | lang=${userLang} | msgs=${messages.length} | user: "${lastUserMsg}"`);

  // Load menu data (from in-memory cache, KV, or D1)
  let menuData;
  try {
    const menuStart = Date.now();
    menuData = await getMenuData(env);
    console.log(`[CHAT] ${ip} | menu loaded in ${Date.now() - menuStart}ms`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load menu';
    console.error(`[CHAT] ${ip} | MENU ERROR: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const systemPrompt = buildSystemPrompt(menuData, locale, userLang);
  console.log(`[CHAT] ${ip} | system prompt: ${systemPrompt.length} chars, ~${Math.ceil(systemPrompt.length / 4)} tokens`);
  const provider = createProvider(env);

  // Server-side tool resolver
  const resolveServerTool = createServerToolResolver(menuData, locale);

  // Create a streaming response using TransformStream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Collect response for logging and session persistence
  const logParts: string[] = [];
  const toolCalls: string[] = [];

  // Run LLM call in background
  const llmPromise = (async () => {
    let success = false;
    try {
      const llmStart = Date.now();
      await provider.chat({
        systemPrompt,
        messages: trimmedMessages,
        tools: TOOLS,
        onText: (text: string) => {
          logParts.push(text);
          writer.write(encoder.encode(encodeTextEvent(text)));
        },
        onToolCall: (call: ChatToolCall) => {
          toolCalls.push(`${call.name}(${JSON.stringify(call.params)})`);
          writer.write(encoder.encode(encodeToolCallEvent(call)));
        },
        resolveServerTool,
      });

      writer.write(encoder.encode(encodeDoneEvent()));
      success = true;

      const totalMs = Date.now() - startTime;
      const llmMs = Date.now() - llmStart;
      const responseText = logParts.join('');
      console.log(`[CHAT] ${ip} | DONE in ${totalMs}ms (llm=${llmMs}ms) | tools=[${toolCalls.join(', ')}] | response: "${responseText}"`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'LLM error';
      console.error(`[CHAT] ${ip} | LLM ERROR: ${msg}`);
      writer.write(encoder.encode(encodeErrorEvent(msg)));
    } finally {
      writer.close();

      // Persist session — fire-and-forget, never blocks the stream.
      // Only save completed sessions (skip LLM errors — partial data isn't useful).
      if (success && env.DB) {
        const assistantContent = logParts.join('');
        const allMessages = [
          ...trimmedMessages,
          ...(assistantContent ? [{ role: 'assistant' as const, content: assistantContent }] : []),
        ];
        const toolCallNames = [...new Set(toolCalls.map(tc => tc.split('(')[0]))];
        ctx.waitUntil(
          env.DB.prepare(
            `INSERT INTO chat_sessions (id, uid, messages, locale, tool_calls, duration_ms, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
            .bind(
              sessionId,
              session.sid,
              JSON.stringify(allMessages),
              locale,
              JSON.stringify(toolCallNames),
              Date.now() - startTime,
              Date.now(),
            )
            .run()
            .catch(err => console.error('[CHAT] session save failed:', err)),
        );
      }
    }
  })();

  // Don't let the worker exit until the stream is done
  void llmPromise;

  return new Response(readable, {
    headers: { ...sseHeaders(), ...corsHeaders },
  });
}

/**
 * Detect the user's language from all user messages in the conversation.
 * Uses simple keyword heuristics on the longest user messages (most reliable).
 * Falls back to Italian since the restaurant is Italian.
 */
function detectUserLanguage(messages: Array<{ role: string; content: string }>): string {
  // Combine all user messages, prioritizing longer ones (more reliable for detection)
  const userTexts = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .sort((a, b) => b.length - a.length); // longest first

  const combined = userTexts.join(' ').toLowerCase();

  // English indicators
  const en = ['what', 'which', 'would', 'could', 'have', 'with', 'the', 'and', 'for',
    'not sure', 'something', 'recommend', 'menu', 'dishes', 'fish', 'meat', 'seafood',
    'i\'m', 'i am', 'do you', 'can you', 'please', 'without', 'allergic', 'vegetarian',
    'looking for', 'tell me', 'show me', 'prefer', 'light', 'local', 'undecided'];

  // German indicators
  const de = ['was', 'welche', 'haben', 'können', 'möchte', 'bitte', 'gericht',
    'fisch', 'fleisch', 'ohne', 'allergisch', 'vegetarisch', 'ich bin', 'empfehlen',
    'speisekarte', 'gibt es', 'hätten', 'gerne', 'und', 'oder', 'nicht'];

  // Italian indicators
  const it = ['cosa', 'quale', 'avete', 'vorrei', 'consiglio', 'piatto', 'pesce',
    'carne', 'senza', 'allergico', 'vegetariano', 'sono', 'menu', 'mi', 'che',
    'per favore', 'potete', 'mangiare', 'bere', 'vino', 'pizza', 'non so'];

  const score = (words: string[]) => words.filter(w => combined.includes(w)).length;

  const scores = { English: score(en), German: score(de), Italian: score(it) };

  // Pick highest scoring language
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  // If no clear signal, fall back to Italian
  return best[1] > 0 ? best[0] : 'Italian';
}

function createServerToolResolver(menuData: MenuDataCache, locale: string) {
  return (call: ChatToolCall): string | null => {
    if (call.name === 'get_item_detail') {
      const itemId = call.params.item_id as string;
      const detail = getItemDetail(menuData, itemId, locale);
      return detail ? JSON.stringify(detail) : JSON.stringify({ error: 'Item not found' });
    }
    if (call.name === 'search_by_allergens') {
      const exclude = call.params.exclude_allergens as string[];
      const results = searchByAllergens(menuData, exclude, locale);
      return JSON.stringify({ count: results.length, items: results });
    }
    return null; // client-side tool
  };
}
