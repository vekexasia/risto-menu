# Risto web

Next.js frontend for Risto Menu, deployed to Cloudflare Pages.

## Stack

- Next.js 16 App Router
- React 19
- next-intl for localized public pages
- Tailwind CSS
- Firebase Auth for admin sessions
- Cloudflare Worker API for catalog/admin data
- Separate Cloudflare chat worker for the AI menu assistant

## Commands

```bash
cd risto-web
npm install
npm run dev          # local Next.js dev server
npm run build        # production/static build
npm run build:cf     # Cloudflare Pages build with production API URLs
npm run deploy:cf    # build + wrangler pages deploy
npm run test:run     # Vitest unit tests
npm run test:e2e     # Playwright, starts dev server
```

## Environment variables

Common local `.env.local` values:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_CHAT_WORKER_URL=http://localhost:8788
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Production values are set in Cloudflare Pages or injected by `npm run build:cf`.
See `../docs/secrets-and-env-vars.md`.

## Routing notes

- Public localized app routes live under `src/app/[locale]/`.
- Admin routes are handled by `src/app/admin/[[...segments]]/AdminRouter.tsx`.
- Shared UI is under `src/components/`.
- API helpers live in `src/lib/api.ts`.
