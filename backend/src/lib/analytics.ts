/**
 * Pure analytics helpers — no DB or network calls.
 * Extracted for testability.
 */

export const VALID_PERIODS = ['24h', '7d', '30d', 'all'] as const;
export type AnalyticsPeriod = typeof VALID_PERIODS[number];

/**
 * Convert a validated period string to milliseconds.
 * Returns `null` for 'all' (no windowing) and `undefined` for unrecognised values
 * (callers should reject as HTTP 400).
 */
export function periodToMs(period: string): number | null | undefined {
  switch (period) {
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d':  return 7  * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
    case 'all': return null;
    default:    return undefined;
  }
}

/**
 * Compute the current-period and previous-period window boundaries.
 *
 * For a finite period:
 *   current window  = [now - periodMs, now)
 *   previous window = [now - 2*periodMs, now - periodMs)
 *
 * For 'all' (periodMs === null):
 *   both starts are 0 (no window constraint).
 */
export function computeWindows(
  now: number,
  periodMs: number | null,
): { currentStart: number; prevStart: number } {
  const currentStart = periodMs !== null ? now - periodMs : 0;
  const prevStart    = periodMs !== null ? now - 2 * periodMs : 0;
  return { currentStart, prevStart };
}


export interface ViewedItemRaw {
  entryId: string | null;
  name: string;
  viewCount: number;
  categoryId?: string | null;
  categoryName?: string | null;
  image?: string | null;
}

export interface ViewedItemRanked extends ViewedItemRaw {
  rank: number;
  previousRank: number | null;
  delta: number | null;
  status: 'new' | 'up' | 'down' | 'same';
}

/**
 * Enrich a current-period leaderboard with movement data compared to the
 * previous-period leaderboard.
 *
 * @param currentItems  Ordered list for the current period (index 0 = rank 1).
 * @param previousItems Ordered list for the previous period (index 0 = rank 1).
 * @returns Enriched list with rank, previousRank, delta, and status.
 */
export function computeLeaderboardMovement(
  currentItems: ViewedItemRaw[],
  previousItems: ViewedItemRaw[],
): ViewedItemRanked[] {
  // Build a Map from entryId → 1-indexed rank for the previous period.
  // null entryId items (deleted menu entries) are mapped by a synthetic key.
  const prevRankMap = new Map<string, number>();
  previousItems.forEach((item, idx) => {
    const key = item.entryId ?? `__null_${idx}`;
    prevRankMap.set(key, idx + 1);
  });

  return currentItems.map((item, idx): ViewedItemRanked => {
    const currentRank = idx + 1;
    const key = item.entryId ?? `__null_${idx}`;
    const previousRank = prevRankMap.get(key) ?? null;

    let delta: number | null;
    let status: 'new' | 'up' | 'down' | 'same';

    if (previousRank === null) {
      delta = null;
      status = 'new';
    } else {
      delta = previousRank - currentRank; // positive = moved up, negative = moved down
      if (delta > 0) {
        status = 'up';
      } else if (delta < 0) {
        status = 'down';
      } else {
        status = 'same';
      }
    }

    return {
      ...item,
      rank: currentRank,
      previousRank,
      delta,
      status,
    };
  });
}
