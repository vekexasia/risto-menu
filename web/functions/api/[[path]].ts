/**
 * API proxy — forwards `/api/*` requests on the Pages domain to the
 * `menu-backend` Worker.
 *
 * Why this exists: Cloudflare Access cookies are scoped per-hostname. A
 * browser-side `fetch()` from the Pages site to the backend Worker on a
 * different hostname can't carry the Access session, and the browser cannot
 * follow Access's login redirect across origins. Putting the API call on the
 * same origin as the SPA (via this proxy) sidesteps that entirely — Access
 * gates the `/api/*` path on the Pages domain, attaches the
 * `Cf-Access-Jwt-Assertion` header, and we forward that header server-to-server
 * to the backend Worker which verifies it.
 */

interface Env {
  API_BACKEND_URL?: string;
}

interface Context {
  request: Request;
  env: Env;
}

export const onRequest = async (context: Context): Promise<Response> => {
  const backend = context.env.API_BACKEND_URL || 'https://menu-backend.vekexasia.workers.dev';

  const incoming = new URL(context.request.url);
  // Strip the leading "/api" prefix so /api/me → backend /me.
  const path = incoming.pathname.replace(/^\/api/, '') || '/';
  const target = new URL(backend.replace(/\/$/, '') + path + incoming.search);

  // Build a forwarded request preserving method, body, and all headers
  // (including Cf-Access-Jwt-Assertion that Access added on the Pages route).
  const forwarded = new Request(target, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
    redirect: 'manual',
  });

  return fetch(forwarded);
};
