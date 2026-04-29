import type { Env } from '../types';

export interface ChatSession {
  sid: string;
  iat: number;
  exp: number;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const encoder = new TextEncoder();

function base64UrlEncode(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof input === 'string'
    ? encoder.encode(input)
    : input instanceof Uint8Array
      ? input
      : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(signature);
}

async function verify(data: string, signature: string, secret: string): Promise<boolean> {
  const key = await importKey(secret);
  return crypto.subtle.verify('HMAC', key, base64UrlDecode(signature), encoder.encode(data));
}

function requireSecret(env: Env): string {
  if (!env.CHAT_SESSION_SECRET) {
    throw new Error('CHAT_SESSION_SECRET is not configured');
  }
  return env.CHAT_SESSION_SECRET;
}

export async function createSessionToken(env: Env): Promise<{ token: string; session: ChatSession }> {
  const now = Math.floor(Date.now() / 1000);
  const session: ChatSession = {
    sid: crypto.randomUUID(),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await sign(payload, requireSecret(env));
  return { token: `${payload}.${signature}`, session };
}

export async function verifySessionToken(env: Env, token: string): Promise<ChatSession> {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) throw new Error('Invalid session token');

  const ok = await verify(payload, signature, requireSecret(env));
  if (!ok) throw new Error('Invalid session signature');

  const decoded = new TextDecoder().decode(base64UrlDecode(payload));
  const session = JSON.parse(decoded) as Partial<ChatSession>;
  if (!session.sid || !session.exp || !session.iat) {
    throw new Error('Invalid session payload');
  }
  if (session.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Session expired');
  }

  return session as ChatSession;
}
