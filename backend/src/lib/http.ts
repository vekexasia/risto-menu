export function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers,
  });
}
