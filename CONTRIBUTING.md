# Contributing to Risto Menu

Thanks for your interest. This project is source-available under the
[PolyForm Noncommercial License 1.0.0](LICENSE) — anyone may read, fork,
self-host, and contribute back for noncommercial use. Commercial use requires
a separate license (see [COMMERCIAL.md](COMMERCIAL.md)).

## Ground rules

- By submitting a pull request, you agree that your contribution is licensed
  under the same terms as the rest of the project (PolyForm Noncommercial 1.0.0)
  and that the maintainer may also relicense it under a commercial license.
- Be civil. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Security issues: do **not** open a public issue. See [SECURITY.md](SECURITY.md).

## Development setup

1. Fork the repo and clone your fork.
2. Install dependencies:
   ```bash
   npm ci
   cd web/workers/chat && npm ci
   ```
3. Copy the example env files and fill in values:
   ```bash
   cp backend/wrangler.toml.example backend/wrangler.toml
   cp backend/.dev.vars.example backend/.dev.vars
   cp web/.env.local.example web/.env.local
   cp web/workers/chat/wrangler.toml.example web/workers/chat/wrangler.toml
   cp web/workers/chat/.dev.vars.example web/workers/chat/.dev.vars
   ```
4. Follow [docs/self-hosting.md](docs/self-hosting.md) to provision Cloudflare
   resources (D1, KV, R2) and Cloudflare Access apps.

## Workflow

1. Create a topic branch off `main`.
2. Run the relevant test suites locally:
   ```bash
   cd backend && npm run check && npm run test:run
   cd web && npm run test:run && npm run build
   cd web/workers/chat && npx tsc --noEmit && npm run test:run
   ```
3. Open a pull request describing the change and the motivation.
4. CI must pass before review.

## Style

- TypeScript strict mode everywhere.
- Reuse existing components — see [CLAUDE.md](CLAUDE.md) for project conventions.
- Tailwind for styling.
- One feature/fix per PR. Keep diffs small.

## Reporting bugs

Open an issue with a clear repro, expected vs. actual behaviour, and your
deployment context (self-hosted / dev / version).
