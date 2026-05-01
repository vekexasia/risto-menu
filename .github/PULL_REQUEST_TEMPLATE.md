## What changed

<!-- One or two sentences. Link an issue if there is one. -->

## Why

<!-- Motivation. What does this fix or enable? -->

## How to test

<!-- Steps a reviewer can take to verify the change locally. -->

## Release impact

<!--
Tick every label that applies and apply the matching label(s) to the PR
on the right sidebar. If only "internal" applies, you're done — skip
the "Breaking change details" / "Migration & upgrade actions" blocks.

If "breaking", "migration", or "upgrade-action" apply, fill in the
relevant block below. Whoever cuts the next release pulls these PRs
via the GitHub UI / `gh pr list --label "release: breaking"` and
copies the details into the release body.
-->

- [ ] `release: breaking` — public API shape, admin workflow, or DB
  schema change that requires an upgrade action.
- [ ] `release: migration` — adds a file under `backend/drizzle/*.sql`.
- [ ] `release: upgrade-action` — operators must run a manual step
  (rename a code, re-link an item, set an env var, regenerate a token).
- [ ] `release: internal` — no user-visible impact (refactor, tests,
  docs, CI). Default for refactors and test-only PRs.

### Breaking change details

<!--
Required if `release: breaking` is ticked. What broke for whom?
Be precise: include API path, schema column, admin URL, etc.
This text gets copied into the GitHub release body.
-->

### Migration & upgrade actions

<!--
Required if `release: migration` or `release: upgrade-action` is ticked.

Migration:
- Filename and what it does to data (not just schema — call out any
  backfill, default values, or dropped columns).

Upgrade actions:
- Concrete commands or admin clicks operators must run, in order.
-->

### Notes for AI agents

<!--
Optional but encouraged when this PR encodes a non-obvious decision
(an invariant two files must respect, a deliberate workaround for a
tooling quirk, a path we tried and rejected). These migrate into
CHANGELOG.md at release time.
-->

## Checklist

- [ ] Tests pass: `cd backend && npm run check && npm run test:run`
- [ ] Tests pass: `cd web && npm run test:run && npm run build`
- [ ] Tests pass: `cd web/workers/chat && npx tsc --noEmit && npm run test:run`
- [ ] No secrets, real tenant IDs, or `.dev.vars` committed
- [ ] Docs updated if behaviour or env vars changed
- [ ] Applied at least one `release:` label

## Licensing

By submitting this pull request, I agree that my contribution is licensed
under the [PolyForm Noncommercial 1.0.0](../LICENSE) and that the maintainer
may also relicense it under a commercial license.
