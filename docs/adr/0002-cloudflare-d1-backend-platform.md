# ADR 0002: Cloudflare D1 backend platform for menu-first scope

- Status: accepted
- Date: 2026-04-28

## Context

The original Cloudflare backend ADR selected Neon Postgres/Hyperdrive for a
larger SaaS surface including orders, bookings, payments, and billing. On
2026-04-19 those transactional features were removed from the product. The
current product scope is:

- public localized menu display
- admin CRUD/settings/hours/analytics
- image uploads and catalog snapshots
- translation helpers
- AI chat recommendations

This is a smaller, read-heavy, edge-friendly workload.

## Decision

Use a Cloudflare-first D1 architecture:

- Cloudflare Workers + Hono for the API
- Cloudflare D1 (SQLite) as system of record
- Drizzle ORM and SQL migrations
- Cloudflare R2 for public images and catalog snapshots where enabled
- Cloudflare Cache API for hot public catalog responses
- Cloudflare Access for admin identity
- Shared Zod schemas in `packages/schemas/`

## Consequences

### Positive

- Fewer moving parts than Workers + external Postgres + Hyperdrive.
- Fits the menu-first, read-heavy workload well.
- Keeps data, compute, cache, and media storage close to Cloudflare Pages.
- Simpler local/integration testing with SQLite-compatible D1 helpers.

### Tradeoffs

- D1 is less suitable than Postgres for complex transactional SaaS workflows.
- If orders/payments/billing return, the database decision should be revisited.
- R2 must be explicitly bound in Worker config before image/snapshot paths are
  fully production-ready.

## Current non-goals

- Ordering
- Table bookings
- Payments
- SaaS billing
- Direct Firestore reads/writes
