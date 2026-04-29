import { describe, it, expect, beforeAll, vi } from 'vitest';
import { testRequest } from './helpers';
import { createTestDb, makeDbEnv, seedSettings, signTestJwt, installJwksMock } from './helpers/db';

beforeAll(() => installJwksMock());

const ADMIN_UID = 'admin-1';

async function adminEnv(extra: Record<string, string> = {}) {
  const db = createTestDb();
  seedSettings(db);
  const env = makeDbEnv(db, { ADMIN_EMAILS: ADMIN_UID, ...extra });
  const token = await signTestJwt(ADMIN_UID);
  return { db, env, headers: { 'Cf-Access-Jwt-Assertion': token } };
}

/**
 * Wraps the test fetch (which already serves JWKS) so that OpenAI calls go to
 * the supplied handler and everything else falls back. Returns a cleanup fn.
 */
function withOpenAIStub(handler: (init?: RequestInit) => Response): () => void {
  const previous = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    if (url === 'https://api.openai.com/v1/chat/completions') {
      return handler(init);
    }
    return previous(input, init);
  });
  return () => vi.stubGlobal('fetch', previous);
}

describe('POST /admin/translate', () => {
  it('returns 401 without auth', async () => {
    const db = createTestDb();
    seedSettings(db);
    const res = await testRequest('/admin/translate', {
      method: 'POST',
      body: { sourceText: 'Pizza', targetLocale: 'en', field: 'name' },
      env: makeDbEnv(db),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    const db = createTestDb();
    seedSettings(db);
    const token = await signTestJwt('not-admin');
    const res = await testRequest('/admin/translate', {
      method: 'POST',
      headers: { 'Cf-Access-Jwt-Assertion': token },
      body: { sourceText: 'Pizza', targetLocale: 'en', field: 'name' },
      env: makeDbEnv(db, { ADMIN_EMAILS: 'someone-else' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 503 when OPENAI_API_KEY is missing', async () => {
    const { env, headers } = await adminEnv();
    const res = await testRequest('/admin/translate', {
      method: 'POST', headers, env,
      body: { sourceText: 'Pizza Margherita', targetLocale: 'en', field: 'name' },
    });
    expect(res.status).toBe(503);
  });

  it('proxies to the OpenAI API and returns the translated text', async () => {
    const { env, headers } = await adminEnv({ OPENAI_API_KEY: 'sk-test' });
    const restore = withOpenAIStub(() => new Response(
      JSON.stringify({ choices: [{ message: { content: 'Margherita Pizza' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));

    try {
      const res = await testRequest('/admin/translate', {
        method: 'POST', headers, env,
        body: { sourceText: 'Pizza Margherita', targetLocale: 'en', field: 'name' },
      });
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, string>;
      expect(body.translatedText).toBe('Margherita Pizza');
    } finally {
      restore();
    }
  });

  it('returns 502 if the OpenAI call fails', async () => {
    const { env, headers } = await adminEnv({ OPENAI_API_KEY: 'sk-test' });
    const restore = withOpenAIStub(() => new Response(
      JSON.stringify({ error: 'rate limited' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    ));

    try {
      const res = await testRequest('/admin/translate', {
        method: 'POST', headers, env,
        body: { sourceText: 'X', targetLocale: 'en', field: 'name' },
      });
      expect(res.status).toBe(502);
    } finally {
      restore();
    }
  });
});
