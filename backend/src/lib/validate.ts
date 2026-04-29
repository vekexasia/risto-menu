import type { Context } from 'hono';
import { type z, flattenError } from 'zod';

export async function parseBody<T extends z.ZodType>(
  c: Context,
  schema: T,
): Promise<z.infer<T> | Response> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return c.json({ error: 'Invalid request', details: flattenError(result.error) }, 400);
  }
  return result.data;
}
