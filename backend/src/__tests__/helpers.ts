import { createApp } from '../app';
import type { Env } from '../types';

const DEFAULT_ENV: Env = {
  APP_ENV: 'development',
  API_VERSION: 'v1',
  SERVICE_NAME: 'risto-test',
  AUTH_ISSUER: 'https://auth.example.com',
  AUTH_AUDIENCE: 'risto-test',
};

interface TestRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  env?: Partial<Env>;
}

/**
 * Build and dispatch a request against a fresh Hono app instance with the
 * provided env overlay. Used by health/env smoke tests; integration-style tests
 * for tenant routes were dropped during the single-tenant collapse.
 */
export async function testRequest(path: string, options: TestRequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, headers = {}, env = {} } = options;

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json', ...headers };
  }

  const app = createApp();
  const url = `https://test.local${path}`;
  const mergedEnv: Env = { ...DEFAULT_ENV, ...env };
  return app.fetch(new Request(url, init), mergedEnv);
}
