interface RateLimitEntry {
  timestamps: number[];
}

interface LastSeenEntry {
  timestamp: number;
}

// In-memory rate limiters. They reset on worker cold start and are paired with
// Cloudflare IP data, which is sufficient for restaurant-scale public chat.
const messageStore = new Map<string, RateLimitEntry>();
const sessionIssueStore = new Map<string, LastSeenEntry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20;
const SESSION_ISSUE_MIN_INTERVAL_MS = 1_000;

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 300_000; // 5 minutes

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - WINDOW_MS;
  for (const [key, entry] of messageStore) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) messageStore.delete(key);
  }

  const sessionCutoff = now - SESSION_ISSUE_MIN_INTERVAL_MS * 10;
  for (const [key, entry] of sessionIssueStore) {
    if (entry.timestamp < sessionCutoff) sessionIssueStore.delete(key);
  }
}

function checkSlidingWindow(key: string): Response | null {
  const now = Date.now();

  cleanup();

  let entry = messageStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    messageStore.set(key, entry);
  }

  const cutoff = now - WINDOW_MS;
  entry.timestamps = entry.timestamps.filter(t => t > cutoff);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  entry.timestamps.push(now);
  return null;
}

/** Rate limit keyed by ip (20 req/min). */
export function checkIpRateLimit(ip: string): Response | null {
  return checkSlidingWindow(`ip:${ip}`);
}

/** Rate limit keyed by session (20 req/min). */
export function checkSessionRateLimit(sessionId: string): Response | null {
  return checkSlidingWindow(`sid:${sessionId}`);
}

/** Gate anonymous session token issuance by ip (1 token/sec). */
export function checkSessionIssueRateLimit(ip: string): Response | null {
  const now = Date.now();
  const key = ip;

  cleanup();

  const entry = sessionIssueStore.get(key);
  if (entry && now - entry.timestamp < SESSION_ISSUE_MIN_INTERVAL_MS) {
    const retryAfterMs = SESSION_ISSUE_MIN_INTERVAL_MS - (now - entry.timestamp);
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
      },
    });
  }

  sessionIssueStore.set(key, { timestamp: now });
  return null;
}

export function clearRateLimitStore() {
  messageStore.clear();
  sessionIssueStore.clear();
  lastCleanup = Date.now();
}
