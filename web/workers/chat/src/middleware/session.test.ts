import { describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from './session';
import type { Env } from '../types';

const env = { CHAT_SESSION_SECRET: 'test-secret' } as Env;

describe('chat session tokens', () => {
  it('creates and verifies a signed session token', async () => {
    const { token, session } = await createSessionToken(env);
    const verified = await verifySessionToken(env, token);

    expect(verified.sid).toBe(session.sid);
    expect(verified.exp).toBeGreaterThan(verified.iat);
  });

  it('rejects tampered tokens', async () => {
    const { token } = await createSessionToken(env);
    const [payload, sig] = token.split('.');
    await expect(verifySessionToken(env, `${payload.slice(0, -1)}x.${sig}`)).rejects.toThrow();
  });

  it('rejects tokens signed with a different secret', async () => {
    const { token } = await createSessionToken(env);
    await expect(verifySessionToken({ CHAT_SESSION_SECRET: 'other' } as Env, token)).rejects.toThrow();
  });
});
