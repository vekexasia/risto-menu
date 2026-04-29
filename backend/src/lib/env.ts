import { z } from 'zod';
import type { Env, RuntimeConfig } from '../types';

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  API_VERSION: z.string().min(1).default('v1'),
  SERVICE_NAME: z.string().min(1).default('risto-backend'),
  AUTH_ISSUER: z.string().min(1).optional(),
  AUTH_AUDIENCE: z.string().min(1).optional(),
});

export function getRuntimeConfig(env: Env): RuntimeConfig {
  const parsed = envSchema.parse(env);

  return {
    appEnv: parsed.APP_ENV,
    apiVersion: parsed.API_VERSION,
    serviceName: parsed.SERVICE_NAME,
    databaseMode: env.DB ? 'd1' : 'unconfigured',
    hasPublicMenuBucket: Boolean(env.PUBLIC_MENU_BUCKET),
    auth: {
      issuer: parsed.AUTH_ISSUER,
      audience: parsed.AUTH_AUDIENCE,
      configured: Boolean(parsed.AUTH_ISSUER && parsed.AUTH_AUDIENCE),
    },
  };
}
