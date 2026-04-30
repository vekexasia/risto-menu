import { createApp } from './app';
import { isDemoMode } from './lib/demo';
import { resetDemoData } from './lib/demo-reset';

import type { Env } from './types';
const app = createApp();

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!isDemoMode(env)) return;

    ctx.waitUntil(resetDemoData(env));
  },
};
