/**
 * API client for the single-tenant Cloudflare backend.
 *
 * Environment variable: NEXT_PUBLIC_API_URL (defaults to localhost:8787 for dev).
 *
 * Firebase Auth issues admin JWTs; the backend verifies them and gates `/admin/*`
 * routes by ADMIN_UIDS (env var on the backend).
 */

import type {
  UpdateSettingsBody,
  UpdateHoursBody,
  UpdateCategoryBody,
  CreateEntryBody,
  UpdateEntryBody,
  CatalogResponse,
  MeResponse,
  AnalyticsResponse,
  ViewedItemRanked,
  TranslateResponse,
  CreatedEntryResponse,
  ImageUploadResponse,
} from '@menu/schemas';

export type { CatalogResponse, MeResponse, AnalyticsResponse, ViewedItemRanked };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

/** Get the current user's ID token from Firebase Auth (bridge during migration) */
async function getIdToken(): Promise<string | null> {
  try {
    const { getAuthInstance } = await import('./firebase');
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = false } = options;

  if (auth) {
    const token = await getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      ...headers,
    },
  };

  if (body !== undefined) {
    if (body instanceof ArrayBuffer) {
      fetchOptions.body = body;
      headers['Content-Type'] = headers['Content-Type'] || 'application/octet-stream';
    } else if (body instanceof Uint8Array) {
      fetchOptions.body = body.buffer as ArrayBuffer;
      headers['Content-Type'] = headers['Content-Type'] || 'application/octet-stream';
    } else {
      fetchOptions.body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }
  }

  fetchOptions.headers = headers;

  const resp = await fetch(`${API_BASE}${path}`, fetchOptions);

  if (!resp.ok) {
    const errorBody = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new ApiError(resp.status, (errorBody as Record<string, string>).error || resp.statusText);
  }

  return resp.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Public API ───────────────────────────────────────────────────────

/** Fetch the full catalog (public, cached). */
export function getCatalog() {
  return apiFetch<CatalogResponse>(`/catalog`);
}

/** Fetch an authenticated admin catalog preview, including draft/hidden items. */
export function getAdminCatalog() {
  return apiFetch<CatalogResponse>(`/admin/catalog`, { auth: true });
}

/** Get the current user's profile + admin status. */
export function getMe() {
  return apiFetch<MeResponse>('/me', { auth: true });
}

// ── Admin API ────────────────────────────────────────────────────────

export interface CustomLocale {
  code: string;
  name: string;
}

export interface RestaurantSettingsResponse {
  chatAgentPrompt: string;
  aiChatEnabled: boolean;
  promotionAlert: Record<string, unknown> | null;
  publicationState: string;
  enabledLocales: string[] | null;
  disabledLocales: string[];
  customLocales: CustomLocale[];
}

export function fetchRestaurantSettings() {
  return apiFetch<RestaurantSettingsResponse>(`/admin/settings`, { auth: true });
}

export function updateRestaurantSettings(data: UpdateSettingsBody) {
  return apiFetch(`/admin/settings`, {
    method: 'PUT',
    body: data,
    auth: true,
  });
}

export function setMenuPublished(published: boolean) {
  return apiFetch(`/admin/publication`, {
    method: 'PUT',
    body: { published },
    auth: true,
  });
}

export function updateOpeningHours(openingSchedule: UpdateHoursBody['openingSchedule']) {
  return apiFetch(`/admin/hours`, {
    method: 'PUT',
    body: { openingSchedule },
    auth: true,
  });
}

export function createCategory(data: { name: string }) {
  return apiFetch<{ id: string }>(`/admin/categories`, {
    method: 'POST',
    body: data,
    auth: true,
  });
}

export function updateCategory(categoryId: string, data: UpdateCategoryBody) {
  return apiFetch(`/admin/categories/${categoryId}`, {
    method: 'PUT',
    body: data,
    auth: true,
  });
}

export function deleteCategory(categoryId: string) {
  return apiFetch(`/admin/categories/${categoryId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export function reorderCategories(items: { id: string; order: number }[]) {
  return apiFetch(`/admin/categories/reorder`, {
    method: 'PATCH',
    body: { items },
    auth: true,
  });
}

export function createEntry(categoryId: string, data: CreateEntryBody) {
  return apiFetch<CreatedEntryResponse>(`/admin/categories/${categoryId}/entries`, {
    method: 'POST',
    body: data,
    auth: true,
  });
}

export function updateEntry(entryId: string, data: UpdateEntryBody) {
  return apiFetch(`/admin/entries/${entryId}`, {
    method: 'PUT',
    body: data,
    auth: true,
  });
}

export function reorderEntries(items: { id: string; order: number }[]) {
  return apiFetch(`/admin/entries/reorder`, {
    method: 'PATCH',
    body: { items },
    auth: true,
  });
}

export function deleteEntry(entryId: string) {
  return apiFetch(`/admin/entries/${entryId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export function moveEntry(entryId: string, targetCategoryId: string) {
  return apiFetch(`/admin/entries/${entryId}/move`, {
    method: 'POST',
    body: { targetCategoryId },
    auth: true,
  });
}

export function uploadEntryImage(entryId: string, imageData: ArrayBuffer) {
  return apiFetch<ImageUploadResponse>(`/admin/entries/${entryId}/image`, {
    method: 'POST',
    body: imageData,
    headers: { 'Content-Type': 'image/jpeg' },
    auth: true,
  });
}

export function deleteEntryImage(entryId: string) {
  return apiFetch(`/admin/entries/${entryId}/image`, {
    method: 'DELETE',
    auth: true,
  });
}

export function uploadHeaderImage(imageData: ArrayBuffer) {
  return apiFetch<ImageUploadResponse>(`/admin/header-image`, {
    method: 'POST',
    body: imageData,
    headers: { 'Content-Type': 'image/jpeg' },
    auth: true,
  });
}

export function uploadPromotionImage(imageData: ArrayBuffer) {
  return apiFetch<ImageUploadResponse>(`/admin/promotion-image`, {
    method: 'POST',
    body: imageData,
    headers: { 'Content-Type': 'image/jpeg' },
    auth: true,
  });
}

export function publishCatalog() {
  return apiFetch(`/catalog/publish`, {
    method: 'POST',
    auth: true,
  });
}

// ── Analytics ────────────────────────────────────────────────────────

export function getAnalytics(
  period: '24h' | '7d' | '30d' | 'all' = '7d',
  limit = 10,
) {
  return apiFetch<AnalyticsResponse>(
    `/admin/analytics?period=${period}&limit=${limit}`,
    { auth: true },
  );
}

export function translateText(
  sourceText: string,
  targetLocale: string,
  field: string,
): Promise<TranslateResponse> {
  return apiFetch<TranslateResponse>(`/admin/translate`, {
    method: 'POST',
    body: { sourceText, targetLocale, field },
    auth: true,
  });
}

export function recordView(entryId: string): Promise<void> {
  // Returns a promise that resolves on success and rejects on failure.
  // Callers are responsible for adding a .catch() if they want fire-and-forget behavior.
  return apiFetch(`/catalog/view`, {
    method: 'POST',
    body: { entryId },
  }).then(() => {});
}
