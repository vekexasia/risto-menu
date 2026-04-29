import { createMiddleware } from 'hono/factory';
import type { Env, RuntimeConfig } from '../types';

export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
  claims: Record<string, unknown>;
}

type AuthBindings = {
  Bindings: Env;
  Variables: {
    config: RuntimeConfig;
    user: AuthUser;
  };
};

/**
 * JWKS cache: fetched once per worker instance, refreshed if verification fails.
 */
let jwksCache: Map<string, CryptoKey> = new Map();
let jwksCacheIssuer: string | null = null;

async function fetchJwks(issuer: string): Promise<Map<string, CryptoKey>> {
  // Try .well-known/openid-configuration first
  const configUrl = issuer.replace(/\/$/, '') + '/.well-known/openid-configuration';
  let jwksUri: string;

  try {
    const configResp = await fetch(configUrl);
    if (configResp.ok) {
      const config = (await configResp.json()) as { jwks_uri?: string };
      jwksUri = config.jwks_uri!;
    } else {
      // Fallback for Firebase Auth and similar
      jwksUri = issuer.replace(/\/$/, '') + '/.well-known/jwks.json';
    }
  } catch {
    jwksUri = issuer.replace(/\/$/, '') + '/.well-known/jwks.json';
  }

  const resp = await fetch(jwksUri);
  if (!resp.ok) {
    throw new Error(`Failed to fetch JWKS from ${jwksUri}: ${resp.status}`);
  }

  const jwks = (await resp.json()) as { keys: (JsonWebKey & { kid?: string })[] };
  const keys = new Map<string, CryptoKey>();

  for (const jwk of jwks.keys) {
    if (jwk.kty !== 'RSA' || !jwk.kid) continue;
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    keys.set(jwk.kid, key);
  }

  return keys;
}

async function getSigningKey(issuer: string, kid: string): Promise<CryptoKey> {
  // Return cached key if available
  if (jwksCacheIssuer === issuer && jwksCache.has(kid)) {
    return jwksCache.get(kid)!;
  }

  // Refresh cache
  jwksCache = await fetchJwks(issuer);
  jwksCacheIssuer = issuer;

  const key = jwksCache.get(kid);
  if (!key) {
    throw new Error(`No signing key found for kid: ${kid}`);
  }
  return key;
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface JwtHeader {
  alg: string;
  kid?: string;
  typ?: string;
}

interface JwtPayload {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  sub?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

async function verifyJwt(
  token: string,
  issuer: string,
  audience: string,
): Promise<JwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header
  const header: JwtHeader = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported algorithm: ${header.alg}`);
  }
  if (!header.kid) {
    throw new Error('JWT missing kid header');
  }

  // Verify signature
  const signingKey = await getSigningKey(issuer, header.kid);
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', signingKey, signature, data);
  if (!valid) {
    throw new Error('Invalid JWT signature');
  }

  // Decode and validate payload
  const payload: JwtPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

  // Require sub claim
  if (!payload.sub) {
    throw new Error('JWT missing sub claim');
  }

  // Require exp claim and check expiration
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp) {
    throw new Error('JWT missing exp claim');
  }
  if (payload.exp < now) {
    throw new Error('JWT expired');
  }

  // Check nbf (not before) if present
  if (payload.nbf && payload.nbf > now) {
    throw new Error('JWT not yet valid (nbf)');
  }

  // Check issuer
  if (payload.iss !== issuer) {
    throw new Error(`Invalid issuer: ${payload.iss}`);
  }

  // Check audience
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(audience)) {
    throw new Error(`Invalid audience: ${payload.aud}`);
  }

  return payload;
}

/**
 * Auth middleware: requires a valid JWT Bearer token.
 * Sets `c.get('user')` with the authenticated user info.
 */
export const requireAuth = createMiddleware<AuthBindings>(async (c, next) => {
  const config = c.get('config');

  if (!config.auth.configured) {
    return c.json({ error: 'Auth not configured on this backend instance' }, 503);
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyJwt(token, config.auth.issuer!, config.auth.audience!);

    const user: AuthUser = {
      uid: payload.sub!,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      claims: payload,
    };

    c.set('user', user);
    await next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return c.json({ error: 'Unauthorized', message }, 401);
  }
});

/**
 * Optional auth middleware: parses JWT if present, but doesn't require it.
 * Sets `c.get('user')` if token is valid, undefined otherwise.
 */
export const optionalAuth = createMiddleware<AuthBindings>(async (c, next) => {
  const config = c.get('config');
  const authHeader = c.req.header('Authorization');

  if (config.auth.configured && authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = await verifyJwt(token, config.auth.issuer!, config.auth.audience!);
      c.set('user', {
        uid: payload.sub!,
        email: payload.email as string | undefined,
        name: payload.name as string | undefined,
        claims: payload,
      });
    } catch {
      // Token invalid — proceed without user
    }
  }

  await next();
});
