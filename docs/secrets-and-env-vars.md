# Secrets & Environment Variables

Complete reference for all secrets and environment variables across the stack.

## Backend — Cloudflare Worker (`menu-backend`)

### Secrets (via `wrangler secret put`)

```bash
cd backend
wrangler secret put OPENAI_API_KEY
```

| Secret | Required | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | Optional | Only needed for the admin translation helper. |

### Non-secret vars (`wrangler.toml` `[vars]` section)

| Variable | Example value | Notes |
|---|---|---|
| `APP_ENV` | `production` | Controls feature flags and logging |
| `AUTH_ISSUER` | `https://securetoken.google.com/<project>` | Firebase project ID |
| `AUTH_AUDIENCE` | `<firebase-project-id>` | Must match `AUTH_ISSUER` project |
| `R2_PUBLIC_URL` | `https://pub-xxx.r2.dev` | Public CDN URL for uploaded images |
| `ALLOWED_ORIGINS` | `https://your-domain.example` | Comma-separated CORS origins |
| `ADMIN_UIDS` | `firebase-uid-1,firebase-uid-2` | Comma-separated Firebase UIDs allowed to access `/admin/*`. |

---

## Chat Worker — Cloudflare Worker (`menu-chat`)

Runtime config lives in `web/workers/chat/wrangler.toml` for non-secrets and
Cloudflare Worker secrets for secrets. Local dev uses
`web/workers/chat/.dev.vars`.

### Secrets (via `wrangler secret put`)

```bash
cd web/workers/chat
wrangler secret put OPENAI_API_KEY
wrangler secret put CHAT_SESSION_SECRET
wrangler secret put REFRESH_SECRET
```

| Secret | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Yes when `LLM_PROVIDER=openai` | Used by the AI chat assistant |
| `ANTHROPIC_API_KEY` | Optional | Only needed if switching provider to Anthropic |
| `REFRESH_SECRET` | Yes for `/refresh-menu` and `/chat/debug` | Shared admin/debug secret |
| `CHAT_SESSION_SECRET` | Yes | HMAC secret for anonymous diner chat session tokens |

### Non-secret vars (`wrangler.toml` `[vars]` section)

| Variable | Example value | Notes |
|---|---|---|
| `LLM_PROVIDER` | `openai` | Provider selector |
| `ALLOWED_ORIGINS` | `https://your-domain.example` | Comma-separated origins allowed to call the chat worker. Localhost is allowed by default. |
| `ALLOWED_HOST_SUFFIXES` | `.your-pages-project.pages.dev` | Comma-separated hostname suffixes allowed over HTTPS. Useful for Pages preview deploys. |

The chat worker does not use Firebase. Diner chat auth uses signed anonymous
session tokens created by `POST /session` and gated by Cloudflare IP.

---

## Frontend — Cloudflare Pages (`menu` by default)

Set in Pages dashboard → Settings → Environment variables (production) and
`web/.env.local` for local dev. If you build locally and `wrangler pages deploy`,
use `web/.env.production.local` (gitignored) instead — the dashboard env vars
only matter when Pages does the build itself.

### Firebase (required)

Get all values from Firebase console → Project settings → Your apps → Web app config.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | |

### App URLs (required)

| Variable | Local dev value | Production value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8787` | `https://<your-backend-worker-url>` |
| `NEXT_PUBLIC_CHAT_WORKER_URL` | `http://localhost:8788` | `https://<your-chat-worker-url>` |

### Optional

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `en` | Default UI locale. One of: `it, en, de, fr, es, nl, ru, pt, vec`. |
| `CF_PAGES_PROJECT` | `menu` | Cloudflare Pages project name used by `npm run deploy:cf`. |

---

## Local-only files

These files may contain real secrets and must stay out of git history:

- `backend/.dev.vars`
- `backend/wrangler.toml`
- `web/.env.local`
- `web/.env.production.local`
- `web/workers/chat/.dev.vars`
- `web/workers/chat/wrangler.toml`
- `backend/backups/`
- `backend/exports/`
- generated outputs: `.next/`, `.open-next/`, `out/`, `.wrangler/`

## Deployment checklist

1. Apply D1 migration:
   ```bash
   cd backend && npx wrangler d1 migrations apply menu-db --remote
   ```

2. Set all Worker secrets (see above).

3. Set Pages environment variables (or `web/.env.production.local` for local builds).

4. Build/deploy:
   ```bash
   cd backend && npm run deploy
   cd ../web/workers/chat && npm run deploy
   cd ../.. && CF_PAGES_PROJECT=menu npm run deploy:cf
   ```
