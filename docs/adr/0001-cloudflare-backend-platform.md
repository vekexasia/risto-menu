# ADR 0001: Cloudflare-first backend platform with Postgres as system of record

- Status: superseded
- Date: 2026-04-11
- Superseded by: `docs/adr/0002-cloudflare-d1-backend-platform.md`
- Related issues: #2, #3, #4, #11

> Historical note: this ADR described the pre-scope-change target architecture
> for a larger SaaS product with orders, bookings, payments, and billing. Those
> features were removed on 2026-04-19, and the implemented backend now uses
> Cloudflare D1 rather than Neon Postgres/Hyperdrive.

## Context

The current backend mixes:

- legacy Firebase Functions runtimes
- Firestore-first reads and writes from the client
- ad-hoc management endpoints for uploads and transactional flows
- weak separation between public catalog reads, admin mutations, and transactional business workflows

That stack was good enough to get the product moving, but it is a poor foundation for a more sellable, multi-tenant restaurant SaaS. The main long-term problems are:

1. **Backend age and maintenance risk**: the current Cloud Functions code uses outdated Node/TypeScript/Firebase dependencies.
2. **Direct client-to-database coupling**: the frontend currently knows too much about Firestore structure and performs direct reads/writes for important flows.
3. **Weak productization**: restaurant tenancy, roles, and admin capabilities are not modeled as a proper platform boundary.
4. **Sellability**: reporting, billing, auditability, support tooling, and controlled rollouts are all easier on a relational system than on the current Firestore-first setup.
5. **Operational clarity**: public reads, admin writes, and transactional flows need different caching, validation, and observability strategies.

## Decision

Adopt a **Cloudflare-first backend architecture** with **Postgres as the system of record**.

### Target platform

- **Cloudflare Workers + Hono** for the main HTTP API
- **Neon Postgres** as the primary relational database
- **Hyperdrive** for Worker-to-Postgres connectivity
- **R2** for media, exports, and public menu snapshot payloads
- **Queues + Cron Triggers** for async workflows and background jobs
- **Drizzle ORM + migrations** for schema management

### Core architectural rules

1. **Postgres is the source of truth** for restaurants, memberships, menus, orders, bookings, payments, and audit data.
2. **Public menu reads must be cache-friendly** and should avoid hitting Postgres on every customer request.
3. **Admin writes must go through validated API endpoints**, never direct client-to-database writes.
4. **Auth and authorization are server-side concerns** handled by the backend, not by client-side role checks.
5. **Production cutover is separate work**. This branch only prepares code, docs, and tooling. No production deployment, import, or migration is performed here.

## Why this instead of D1-first

D1 is attractive for cost and Cloudflare purity, but the long-term center of gravity of this product is not a tiny read-heavy menu site. It is a business platform with:

- multi-tenant restaurants
- roles and memberships
- admin backoffice workflows
- orders and bookings
- payments and notifications
- reporting and analytics
- future billing / subscription operations

Those concerns fit Postgres better than a D1-first design. We still keep the Cloudflare benefits for compute, edge delivery, caching, queues, and storage, while using a relational database where it matters most.

## Expected consequences

### Positive

- Better fit for multi-tenant SaaS growth
- Easier analytics and reporting
- Cleaner server-side authorization model
- Easier to reason about transactional business workflows
- Lower risk of needing another backend redesign later
- Cloudflare remains the public execution and delivery layer

### Negative

- More moving pieces than a one-vendor Firebase clone
- Requires a deliberate import/cutover strategy
- Adds relational schema design work up front
- Requires a new backend workspace and local development flow

## Rollout strategy

1. Document target architecture and environment model
2. Scaffold backend workspace locally
3. Define schema and repeatable import pipeline
4. Build auth/tenant model and public catalog caching path
5. Port admin writes and transactional flows
6. Cut frontend over from Firestore access to API-backed data
7. Perform a separate staging rehearsal and production cutover later

## Non-goals for this branch

- no production deployment
- no production database import
- no DNS/domain cutover
- no disabling of the current live Firebase backend

## Notes

This ADR intentionally optimizes for long-term product fit rather than for the cheapest possible infrastructure bill. Cloudflare stays central, but the system of record moves to Postgres so the platform can grow without repainting the backend again in a year.
