import type { Env } from '../types';

export function isDemoMode(env: Env): boolean {
  return env.DEMO_MODE === 'true';
}
