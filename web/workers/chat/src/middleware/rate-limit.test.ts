import { describe, it, expect, beforeEach } from 'vitest';
import { checkIpRateLimit, checkSessionIssueRateLimit, checkSessionRateLimit, clearRateLimitStore } from './rate-limit';

function uniqueIp() {
  return `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

beforeEach(() => clearRateLimitStore());

describe('message rate limits', () => {
  it('allows IP requests under the limit', () => {
    const ip = uniqueIp();
    for (let i = 0; i < 20; i++) {
      expect(checkIpRateLimit(ip)).toBeNull();
    }
  });

  it('blocks the 21st IP request within the window', () => {
    const ip = uniqueIp();
    for (let i = 0; i < 20; i++) checkIpRateLimit(ip);
    const result = checkIpRateLimit(ip);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it('different IPs have independent limits', () => {
    const ip1 = uniqueIp();
    const ip2 = uniqueIp();
    for (let i = 0; i < 20; i++) checkIpRateLimit(ip1);
    expect(checkIpRateLimit(ip2)).toBeNull();
  });

  it('also limits by session id', () => {
    for (let i = 0; i < 20; i++) checkSessionRateLimit('sid-1');
    const result = checkSessionRateLimit('sid-1');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    expect(checkSessionRateLimit('sid-2')).toBeNull();
  });
});

describe('session issuance rate limit', () => {
  it('allows first token and blocks immediate second token for same IP', () => {
    const ip = uniqueIp();
    expect(checkSessionIssueRateLimit(ip)).toBeNull();
    const result = checkSessionIssueRateLimit(ip);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it('different IPs have independent issuance limits', () => {
    const ip1 = uniqueIp();
    const ip2 = uniqueIp();
    expect(checkSessionIssueRateLimit(ip1)).toBeNull();
    expect(checkSessionIssueRateLimit(ip2)).toBeNull();
  });
});
