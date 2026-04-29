import type { AuthUser } from './middleware/auth';
import type { createDb } from './db/index';

export interface Env {
  APP_ENV?: string;
  API_VERSION?: string;
  SERVICE_NAME?: string;
  ALLOWED_ORIGINS?: string;
  ALLOWED_HOST_SUFFIXES?: string;
  DB?: D1Database;
  PUBLIC_MENU_BUCKET?: R2Bucket;
  R2_PUBLIC_URL?: string;
  AUTH_ISSUER?: string;
  AUTH_AUDIENCE?: string;
  ADMIN_UIDS?: string;
  OPENAI_API_KEY?: string;
  BASE_DOMAIN?: string;
}

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface RuntimeConfig {
  appEnv: AppEnvironment;
  apiVersion: string;
  serviceName: string;
  databaseMode: 'd1' | 'unconfigured';
  hasPublicMenuBucket: boolean;
  auth: {
    issuer?: string;
    audience?: string;
    configured: boolean;
  };
}

/** Variables set by middleware, available via c.get() */
export interface AppVariables {
  config: RuntimeConfig;
  user: AuthUser;
  db: NonNullable<ReturnType<typeof createDb>>;
}

/** Standard Hono app bindings for typed route handlers */
export type AppBindings = {
  Bindings: Env;
  Variables: AppVariables;
};
