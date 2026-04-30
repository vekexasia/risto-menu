# Risto Menu

Self-hostable digital restaurant menu, built on Next.js and Cloudflare. Diners scan a QR code, browse a localized menu, and can ask an optional AI assistant for recommendations.

**One menu, one deploy.** Each instance serves a single restaurant. There is no tenant slug in the URL, no admin restaurant picker, and no domain-mapping layer. To run a second restaurant, deploy the stack a second time.

Restaurant owners manage the menu from `/admin`. Diners land on `/{locale}/menu` and browse in one of nine supported locales.

## Live demo

Try the public demo: **https://risto-menu.andreabaccega.com**

- Public menu: https://risto-menu.andreabaccega.com/en/menu/
- Admin: https://risto-menu.andreabaccega.com/admin

The demo is editable and public. Data resets automatically, so do not enter real customer data.
Tony, the menu assistant, is enabled with a daily usage cap for the demo.

<table>
  <tr>
    <td><img src="docs/assets/demo-mobile-menu.jpg" alt="Mobile menu" width="180" /></td>
    <td><img src="docs/assets/demo-mobile-item.jpg" alt="Mobile item detail" width="180" /></td>
    <td><img src="docs/assets/demo-mobile-tony.jpg" alt="Tony chat" width="180" /></td>
  </tr>
  <tr>
    <td colspan="3"><img src="docs/assets/demo-admin-desktop.jpg" alt="Desktop admin" width="560" /></td>
  </tr>
</table>

## What it does

- Public QR menu at `/{locale}/menu` with localized category and item content.
- Admin SPA at `/admin` for settings, categories, entries, variants, extras, images, opening hours, publishing, and translations.
- Optional AI chat assistant that can recommend items from the current menu.
- Privacy-safe catalog view tracking for basic analytics.
- Cloudflare Access admin auth, so there is no in-app password system to run.
- Single-tenant deployment model designed for one restaurant per stack.

## Status

Source-available. Single-tenant. The older multi-tenant version lived through April 2026; `main` is now the simplified single-tenant app.

## License

[PolyForm Noncommercial 1.0.0](LICENSE) — free for personal, non-commercial,
academic, charity, and government use.

**Commercial use** (running it for a paying restaurant, hosting it as a
service, embedding it in a paid product) requires a separate license. See
[COMMERCIAL.md](COMMERCIAL.md).

## Stack

| Component | What |
|---|---|
| `web/` | Next.js 16 (App Router), deployed to Cloudflare Pages |
| `backend/` | Hono API on Cloudflare Workers, Drizzle ORM over Cloudflare D1 |
| `web/workers/chat/` | Separate Cloudflare Worker for the AI chat assistant with SSE streaming and tool calls |
| `packages/schemas/` | Shared Zod schemas (`@menu/schemas`) |
| Auth | Cloudflare Access with backend JWT verification |
| Storage | Cloudflare R2 for images and catalog snapshots, Cloudflare KV for the chat menu cache |

## Self-hosting

Full walkthrough: **[docs/self-hosting.md](docs/self-hosting.md)**.

Prerequisites: Node 22+, npm 10+, Git, and a Cloudflare account with Zero Trust enabled.

Quick local setup:
```bash
git clone https://github.com/vekexasia/risto-menu.git
cd risto-menu

npm ci
cd web/workers/chat && npm ci && cd -

# Create .risto-menu.local.json and generated local config files
npm run initialize

# If you accepted placeholder IDs, provision Cloudflare resources, update
# .risto-menu.local.json, then regenerate
(cd backend && npx wrangler d1 create menu-db)
(cd web/workers/chat && npx wrangler kv namespace create MENU_CACHE)
npm run config:generate

# Apply local migrations
(cd backend && npx wrangler d1 migrations apply menu-db --local)

# Terminal 1: backend API
cd backend && npm run dev

# Terminal 2: chat worker
cd web/workers/chat && npm run dev

# Terminal 3: frontend
cd web && npm run dev
```

Open the frontend dev server's `/en/menu` path for the diner menu.

For admin work, production uses Cloudflare Access at `/admin`. In local dev, either point `NEXT_PUBLIC_API_URL` at a deployed backend or use the Playwright admin bypass described in [docs/self-hosting.md](docs/self-hosting.md#8-run-locally). The first migration seeds a `settings` row named "My Restaurant"; change it from `/admin?s=settings`.

## Common commands

```bash
# Frontend
cd web && npm run dev
cd web && npm run build
cd web && npm run test:run
cd web && npm run deploy:cf      # CF_PAGES_PROJECT defaults to "menu"

# Backend API
cd backend && npm run dev
cd backend && npm run check
cd backend && npm run test:run
cd backend && npm run deploy

# Chat worker
cd web/workers/chat && npm run dev
cd web/workers/chat && npm run test:run
cd web/workers/chat && npm run deploy
```

## Documentation

- [Self-hosting guide](docs/self-hosting.md) — deploy your own copy
- [Secrets & env vars](docs/secrets-and-env-vars.md) — full reference
- [Architecture & coding conventions](CLAUDE.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

## Contact

- Issues / bugs / features → GitHub issues
- Security → see [SECURITY.md](SECURITY.md)
- Commercial licensing → see [COMMERCIAL.md](COMMERCIAL.md)
