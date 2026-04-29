## What changed

<!-- One or two sentences. Link an issue if there is one. -->

## Why

<!-- Motivation. What does this fix or enable? -->

## How to test

<!-- Steps a reviewer can take to verify the change locally. -->

## Checklist

- [ ] Tests pass: `cd backend && npm run check && npm run test:run`
- [ ] Tests pass: `cd web && npm run test:run && npm run build`
- [ ] Tests pass: `cd web/workers/chat && npx tsc --noEmit && npm run test:run`
- [ ] No secrets, real tenant IDs, or `.dev.vars` committed
- [ ] Docs updated if behaviour or env vars changed

## Licensing

By submitting this pull request, I agree that my contribution is licensed
under the [PolyForm Noncommercial 1.0.0](../LICENSE) and that the maintainer
may also relicense it under a commercial license.
