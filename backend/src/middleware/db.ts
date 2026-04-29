import { createMiddleware } from 'hono/factory';
import type { Env, RuntimeConfig } from '../types';
import { createDb } from '../db/index';

type DbBindings = {
  Bindings: Env;
  Variables: {
    config: RuntimeConfig;
    db: NonNullable<ReturnType<typeof createDb>>;
  };
};

/**
 * Database middleware: creates a Drizzle DB instance from env and
 * makes it available as `c.get('db')`. Returns 503 if database is unconfigured.
 */
export const requireDb = createMiddleware<DbBindings>(async (c, next) => {
  const db = createDb(c.env);
  if (!db) {
    return c.json({ error: 'Database not configured' }, 503);
  }
  c.set('db', db);
  await next();
});
