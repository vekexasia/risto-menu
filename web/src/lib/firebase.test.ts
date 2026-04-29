/*
 * Tests for firebase.ts lazy Auth singleton initialization.
 *
 * We mock the Firebase SDK modules so tests never hit real Firebase.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => {
  function GoogleAuthProvider() {}
  function RecaptchaVerifier() {
    return { clear: vi.fn() };
  }
  return {
    getAuth: vi.fn(() => ({ type: 'mock-auth' })),
    RecaptchaVerifier,
    GoogleAuthProvider,
    signInWithPopup: vi.fn().mockResolvedValue({ user: { uid: 'test' } }),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
});

import { getAuthInstance, signInWithGoogle, signOut } from './firebase';

describe('firebase auth singletons', () => {
  it('getAuthInstance returns an auth instance', () => {
    const auth = getAuthInstance();
    expect(auth).toBeTruthy();
  });

  it('getAuthInstance returns the same instance on second call (cached)', () => {
    const a1 = getAuthInstance();
    const a2 = getAuthInstance();
    expect(a1).toBe(a2);
  });

  it('signInWithGoogle calls signInWithPopup', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    await signInWithGoogle();
    expect(signInWithPopup).toHaveBeenCalled();
  });

  it('signOut calls firebase signOut', async () => {
    const { signOut: fbSignOut } = await import('firebase/auth');
    await signOut();
    expect(fbSignOut).toHaveBeenCalled();
  });
});
