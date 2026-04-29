# Self-hosting Risto Menu

This guide walks through deploying your own copy on Cloudflare + Firebase.
Everything here is free-tier-friendly; you only pay if traffic or AI chat
usage grows.

**Single-tenant model.** This deployment serves one restaurant. To run a
second restaurant, repeat this setup with a different Pages project name,
fresh D1 database, fresh KV namespace, and fresh worker names.

---

## What you'll provision

| Service | Purpose | Free tier ok? |
|---|---|---|
| Cloudflare Workers | `menu-backend` API + `menu-chat` AI assistant | Yes (100k req/day) |
| Cloudflare Pages | Next.js frontend (`menu`) | Yes |
| Cloudflare D1 | SQLite database (settings, menus, entries, analytics) | Yes (5 GB) |
| Cloudflare R2 | Image uploads + catalog snapshot cache | Yes (10 GB) |
| Cloudflare KV | Chat menu cache | Yes |
| Firebase Auth | Admin login (Google, email/password, phone) | Yes |
| OpenAI API | Diner chat + admin translation helper | **Paid** (optional) |

**Heads up:** the AI chat is optional. If you do not set
`OPENAI_API_KEY` on the chat worker, you can disable the chat from the
admin UI (Settings → Chat AI) — the rest of the app runs fine.

---

## 1. Prerequisites

```bash
node >= 22
npm >= 10
git
npm i -g wrangler   # optional; the local devDep is also fine
```

You'll also need:

- A Cloudflare account (free).
- A Firebase project (free Spark tier). Enable **Authentication** with the
  sign-in methods you want.
- Your own Firebase UID (you'll list it in `ADMIN_UIDS`).
- (Optional) An OpenAI API key with a small monthly cap.

---

## 2. Clone and install

```bash
git clone https://github.com/vekexasia/risto-menu.git
cd risto-menu

npm ci
cd web/workers/chat && npm ci && cd -
```

---

## 3. Cloudflare resources

```bash
npx wrangler login
```

### 3.1 D1 database

```bash
cd backend
npx wrangler d1 create menu-db
```

Copy the returned `database_id`.

### 3.2 KV namespace (chat worker menu cache)

```bash
cd ../web/workers/chat
npx wrangler kv namespace create MENU_CACHE
```

Copy the returned `id`.

### 3.3 R2 bucket (optional but recommended for image uploads)

```bash
cd ../../../backend
npx wrangler r2 bucket create menu-public
```

Enable public access on the bucket in the Cloudflare dashboard and copy the
`pub-XXXX.r2.dev` URL (or attach a custom domain).

### 3.4 Wire IDs into wrangler.toml

```bash
cp backend/wrangler.toml.example      backend/wrangler.toml
cp web/workers/chat/wrangler.toml.example  web/workers/chat/wrangler.toml
```

Edit each `wrangler.toml` and fill in:

- `database_id` (D1)
- `id` under `[[kv_namespaces]]` (KV, chat worker only)
- `R2_PUBLIC_URL` if using R2 (backend only)
- `ALLOWED_ORIGINS` (the URLs your frontend will run on; both backend and chat worker)
- `ALLOWED_HOST_SUFFIXES` (Pages preview deploys, e.g. `.menu.pages.dev`; chat worker only)
- `AUTH_ISSUER` / `AUTH_AUDIENCE` (your Firebase project id — see step 4)
- `ADMIN_UIDS` — comma-separated list of Firebase UIDs allowed to access `/admin/*` (backend only)

---

## 4. Firebase project

1. Create a project at <https://console.firebase.google.com/>.
2. **Build → Authentication → Get started**. Enable the sign-in methods you want.
3. **Project settings → General → Your apps → Web app**. Register a web app
   and copy the SDK config — you'll paste it into `web/.env.local`.
4. Note your **Project ID**. You'll use it in two places:
   - `AUTH_ISSUER=https://securetoken.google.com/<your-project-id>`
   - `AUTH_AUDIENCE=<your-project-id>`
5. Sign in once via the running app, then grab your **Firebase UID** from
   the Firebase Auth console and put it in `ADMIN_UIDS`.

The backend verifies admin JWTs against the public JWKS — no Firebase
service-account JSON is needed.

---

## 5. Frontend env

```bash
cp web/.env.local.example web/.env.local
```

Fill in `NEXT_PUBLIC_FIREBASE_*` from the Firebase web app config, plus:

- `NEXT_PUBLIC_API_URL` — your backend Worker URL (or `http://localhost:8787` for dev)
- `NEXT_PUBLIC_CHAT_WORKER_URL` — your chat Worker URL (or `http://localhost:8788`)
- `NEXT_PUBLIC_DEFAULT_LOCALE` — default UI language (`en`, `it`, `de`, …)

---

## 6. Secrets

```bash
# Backend (only needed if you use the admin translation helper)
cd backend
echo "OPENAI_API_KEY=sk-..." >> .dev.vars        # local dev
npx wrangler secret put OPENAI_API_KEY            # production

# Chat worker
cd ../web/workers/chat
cp .dev.vars.example .dev.vars

# Generate two random secrets:
openssl rand -hex 32   # → CHAT_SESSION_SECRET
openssl rand -hex 32   # → REFRESH_SECRET

# Edit .dev.vars and paste them in. For production:
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put CHAT_SESSION_SECRET
npx wrangler secret put REFRESH_SECRET
```

---

## 7. Apply database migrations

```bash
cd backend

# Local D1 (created on first dev run)
npx wrangler d1 migrations apply menu-db --local

# Remote D1 (production)
npx wrangler d1 migrations apply menu-db --remote
```

The initial migration creates all tables and seeds a singleton `settings` row
with name "My Restaurant". You'll edit that from `/admin` later.

---

## 8. Run locally

Three terminals:

```bash
# 1. Backend API
cd backend && npm run dev          # → http://localhost:8787

# 2. Chat worker
cd web/workers/chat && npm run dev # → http://localhost:8788

# 3. Frontend
cd web && npm run dev              # → http://localhost:3000
```

Open <http://localhost:3000/admin>, log in with Firebase, and start
editing categories, entries, hours, and settings.

---

## 9. Deploy

```bash
# Backend
cd backend && npm run deploy

# Chat worker
cd ../web/workers/chat && npm run deploy

# Frontend (Cloudflare Pages)
cd ../.. && CF_PAGES_PROJECT=menu npm run deploy:cf
```

For Pages, set the same `NEXT_PUBLIC_*` vars in the Pages dashboard
(Settings → Environment variables) so production builds pick them up — or,
if you build locally, put them in `web/.env.production.local` (gitignored).

---

## 10. Custom domain

Point your domain at the Pages project:

1. Cloudflare Pages → your project → **Custom domains** → add your domain.
2. Add the same domain to `ALLOWED_ORIGINS` in `backend/wrangler.toml` and
   `web/workers/chat/wrangler.toml`. Re-deploy both workers.
3. In `web/.env.production.local`, set `NEXT_PUBLIC_API_URL` and
   `NEXT_PUBLIC_CHAT_WORKER_URL` to your worker URLs and re-build / re-deploy
   the frontend.

That's it. There is no per-restaurant domain mapping table — the deployment
**is** your restaurant.

---

## Cost notes

- Cloudflare free tier covers a small restaurant comfortably.
- OpenAI usage scales with chat traffic. Set a hard monthly cap.
- If you do not need AI chat, skip step 6's chat-worker secrets and disable
  `ai_chat_enabled` from `/admin?s=settings-chat-ai`.

---

## Troubleshooting

- **`wrangler.toml not found`** — copy from `wrangler.toml.example`.
- **403 on `/admin`** — your Firebase UID isn't in `ADMIN_UIDS` on the backend
  worker. Add it and `npx wrangler deploy`.
- **CORS errors** — your frontend origin isn't in `ALLOWED_ORIGINS`. Update
  both backend and chat worker `wrangler.toml`, redeploy, and double-check
  Pages build-time env vars match what the workers know about.
- **Empty menu / `Menu not published`** — go to `/admin?s=settings-publishing`
  and toggle the menu to Published.
- **Chat returns 503 / 403** — `OPENAI_API_KEY` not set on the chat worker, or
  `ai_chat_enabled` is false. Both are configurable in the admin UI.
