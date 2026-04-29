# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Risto Menu is a React/Next.js **single-tenant** digital menu for restaurants.
Diners scan a QR code and browse a localized menu (nine languages) with
optional AI-assisted chat recommendations. The restaurant owner manages
everything through `/admin`.

One deployment serves one restaurant. There is no tenant slug in the URL,
no admin restaurant picker, no domain-mapping table. To run a second
restaurant, deploy the stack a second time.

Ordering, table bookings, and payments were removed on 2026-04-19. The
multi-tenant collapse to single-tenant happened on 2026-04-29.

## Common Commands

```bash
# Frontend
cd web && npm install
cd web && npm run dev
cd web && npm run build
cd web && npm run test:run
cd web && npm run test:e2e        # requires dev server
cd web && npm run deploy:cf

# Backend (Cloudflare Worker)
cd backend && npm install
cd backend && npm run dev                # wrangler dev
cd backend && npm run deploy             # wrangler deploy
cd backend && npm run test:run
cd backend && npx wrangler d1 migrations apply menu-db --remote

# Chat worker
cd web/workers/chat && npm install
cd web/workers/chat && npm run dev
cd web/workers/chat && npm run deploy
cd web/workers/chat && npm run test:run

# Import a restaurant from a legacy backup JSON
cd backend && npm run import:backup -- --file backups/<file>.json
```

## Architecture

### React App (web/)
- **Next.js 16** with App Router and Turbopack
- **src/app/**: Routes using App Router
  - `/`: Locale-detect redirect to `/{defaultLocale}/menu`
  - `[locale]/`: Localized pages — `it, en, de, fr, es, nl, ru, pt, vec` (9 locales). Default via `NEXT_PUBLIC_DEFAULT_LOCALE`.
  - `[locale]/menu/`: Public diner menu (the only menu route)
  - `[locale]/info/`: Restaurant info page
  - `admin/[[...segments]]/`: Single admin SPA, sub-pages selected via `?s=` query param
- **src/components/**: Reusable UI components
  - `admin/`: Admin panel pages + shared admin widgets
  - `chat/`: AI chat panel + message rendering
  - `home/`: Homepage card components
  - `menu/`: Menu display components (item detail, info modal, promotion popup)
  - `ui/`: Generic UI elements (e.g. `LanguagePicker`)
- **src/lib/**: API client, content-presentation, types, utils
- **src/stores/**: State management (Zustand): `restaurantStore`, `chatStore`, `chatActionsStore`, `menuSelectionStore`, `uiStore`
- **src/hooks/**: Custom React hooks (`useStreamingChat`, `useBackButtonClose`)

### Cloudflare Worker Backend (backend/)
Hono app serving the REST API. Drizzle ORM over Cloudflare D1 (SQLite).
Route groups:
- `/catalog` — public menu (cached via Cache API + R2 snapshot)
- `/catalog/view` — privacy-safe view tracking
- `/catalog/publish` — admin-only, regenerates the R2 snapshot
- `/me` — authenticated user profile + `isAdmin` flag
- `/admin/...` — admin CRUD for settings, categories, entries, hours, analytics, translations.
  Gated by `requireAdmin` middleware which checks the user's email (from the
  Cloudflare Access JWT's `email` claim) against `ADMIN_EMAILS` env.

### Chat Worker (web/workers/chat/)
Separate Cloudflare Worker for the AI chat assistant. SSE streaming. Tool calls
include `show_items` and `show_choices`.

### D1 Schema (backend/src/db/schema.ts)
Tables: `settings` (singleton, `id = 1`), `menus`, `menu_categories`,
`menu_entries`, `menu_variants`, `menu_extras`, `audit_events`,
`catalog_views`, `chat_sessions`. No `users`, no `restaurants`, no
`restaurant_memberships`, no `restaurant_domains` — single-tenant deploys
don't need them. Prices are stored as integer cents. i18n blobs are JSON columns.

### Cloudflare Access (admin auth)
Cloudflare Access sits in front of `/admin/*` (Pages) and the backend Worker.
The user logs in once via the Access-hosted page (Google, GitHub, email OTP,
SAML — your IdP choice), CF sets a session cookie, and authenticated requests
get a `Cf-Access-Jwt-Assertion` header. The backend verifies that JWT against
the team's JWKS at `<team>/cdn-cgi/access/certs` and uses the `email` claim
as the principal. No Firebase, no in-app login UI.

Diner chat uses Cloudflare Worker signed anonymous sessions (HMAC tokens
issued by the chat worker, gated by Cloudflare IP rate-limit).

## Key Patterns

- Uses next-intl for internationalization
- Tailwind CSS for styling
- Cloudflare Access for admin login; backend verifies the Access JWT via JWKS
- Cloudflare D1 for data, R2 for images, Pages for frontend

## Coding Guidelines

- **Always reuse existing components**: Before creating new UI components or utilities, check if similar functionality already exists in the codebase.
- Use TypeScript strictly
- Follow existing component patterns in src/components/

## Menu Visibility System

Menu entries have a `menuVisibility` field (array) that controls where items appear:
- `["all"]` - Visible on all menus (seated + drinks)
- `["seated"]` - Visible only on the Seated/Table menu
- `["takeaway"]` - Visible only on the Drinks menu
- `[]` (empty) - Hidden from customers, only visible to restaurant owner

## Testing

Run commands:
- Frontend unit: `cd web && npm run test:run`
- Frontend E2E: `cd web && npm run test:e2e` (requires dev server)
- Backend unit: `cd backend && npm run test:run`

Test directories: `web/src/**/*.test.{ts,tsx}`, `web/e2e/*.spec.ts`, `backend/src/__tests__/*.test.ts`

### Test Coverage

| Layer | Minimum | Target | Notes |
|---|---|---|---|
| `web/src/` (frontend) | 60% | 80% | Unit + E2E combined |
| `web/workers/chat/` | 50% | 70% | E2E covers happy paths |
| `backend/src/` | 60% | 75% | Route-level tests rebuilt 2026-04-29 (73 tests across 10 files). In-memory D1 helper at `src/__tests__/helpers/db.ts`. |

Security boundary (`requireAdmin` middleware) must be 100% covered regardless.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
