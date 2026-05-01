# Changelog

All notable changes to Risto Menu.

The project does not currently publish versioned releases — each entry is dated
and corresponds to a deploy of `main`. If you fork and tag, switch to the
[Keep-a-Changelog](https://keepachangelog.com) `[X.Y.Z]` heading style.

Each release entry includes a **Notes for AI agents** subsection. Those notes
are written for LLM coding assistants picking up this codebase in a future
session: they call out file moves, schema invariants, and gotchas that aren't
obvious from the diff but matter when extending the feature.

## 2026-05-01 — Multi-menu and standard icons

### Added

- Arbitrary user-defined menus replace the rigid `seated`/`takeaway` split.
  Each menu has a code (URL slug), title (with i18n), `published` toggle,
  drag-orderable position, and a curated standard icon. Owners create and
  rename menus from a new top-level admin page (`?s=menus`).
- Many-to-many entry membership: a single dish can appear on any subset of
  menus via the new `menu_entry_memberships(menu_id, entry_id)` join table.
- Per-entry `hidden` flag (independent of per-menu draft) for owner-only
  items that should disappear from the public catalog without being deleted.
- Items admin page gains a menu filter (`All` / `<each menu>` / `No menu`)
  and a "Show hidden" toggle so orphans from the migration are findable.
- Curated set of inline-SVG icons rendered by `<MenuIcon>`: `utensils`,
  `lunch`, `dinner`, `breakfast`, `wine`, `beer`, `cocktail`, `coffee`,
  `pizza`, `burger`, `dessert`, `salad`, `fish`, `bread`. Picker grid in
  the Menus admin modal.
- New backend endpoints: `GET/POST /admin/menus`, `PATCH/DELETE /admin/menus/:id`,
  `PATCH /admin/menus/reorder`. `POST /admin/categories` was missing entirely
  before — also added.

### Changed

- Catalog response shape: `categories[]` is now top-level (with entries that
  carry `menuIds[]` and `hidden`); `menus[]` carries metadata only
  (`id`, `code`, `title`, `i18n`, `published`, `sortOrder`, `icon`).
- `OpeningSchedule` is a single `WorkingHours` (no `seated`/`takeaway`
  split). The Hours admin page collapsed accordingly.
- `MenuEntry` admin form: visibility radio replaced with a per-menu chip
  multi-select + a separate "Hidden" toggle.
- Public route is `/[locale]/menu` driven by `?type=<menu-code>`.
  `?type=drinks` aliases to a `drinks`- or `takeaway`-coded menu so old
  QR codes from the seated/takeaway era keep working.

### Removed

- `MenuVisibilitySchema` (`'all' | 'seated' | 'takeaway' | 'hidden'`) and the
  `MenuSelection` enum. `menuVisibility` is gone from `MenuEntry`.
- `RestaurantMessages.onCartSeated` / `onCartTakeaway` (no cart flow exists).
- `web/src/stores/menuSelectionStore.{ts,test.ts}` and the
  `useIsSeated` / `useIsTakeaway` / `useHasSelection` hooks.

### Migrations

- **0001_multi_menu.sql** — schema rewrite + data backfill:
  - drops `menu_categories.menu_id` (categories become flat),
  - drops `menu_entries.visibility`, adds `menu_entries.hidden`,
  - adds `menus.published`, `menus.sort_order`,
  - creates `menu_entry_memberships`,
  - seeds memberships from the legacy visibility flag (`'all'` → all menus,
    `'<code>'` → menu with that code, `'hidden'` → no memberships +
    `hidden=1`),
  - assigns `menus.sort_order` (seated=0, takeaway=1, others 2),
  - collapses `settings.opening_schedule` from `{seated, takeaway}` to a
    single `WorkingHours`, preferring `seated`.
- **0002_menu_icon.sql** — adds `menus.icon` `TEXT NOT NULL DEFAULT 'utensils'`.

### Upgrade actions for operators

- Apply migrations: `npx wrangler d1 migrations apply menu-db --remote`.
- After deploy, sign in to `/admin?s=menus` and rename the legacy `seated`
  / `takeaway` codes to whatever fits the restaurant (e.g. `food`,
  `drinks`, `lunch`, `wines`).
- Pick a standard icon for each menu — every menu defaulted to `utensils`.
- Use the Items page filter `All menus → No menu` plus "Show hidden" to
  find any entries the migration orphaned (these will be entries that had
  `visibility='hidden'` in the old model). Re-attach to a menu or delete.

### Notes for AI agents

- The membership table is the single source of truth for which menu an entry
  belongs to. Categories are flat (no `menuId` parent). Do not reintroduce
  a category→menu hierarchy — see `docs/adr/` if a decision record is added
  later.
- The `?type=` query param is intentional. Static export (`output: "export"`
  in `next.config.ts`) forbids runtime dynamic route segments, so a
  `/menu/[code]` route would require enumerating every menu code at build
  time — but codes are user-defined in D1. Keep menu routing query-based.
- `MENU_ICONS` lives in **two** places: `packages/schemas/src/catalog.ts`
  (zod enum, used to validate writes) and
  `web/src/components/menu/MenuIcon.tsx` (renderer + admin picker). They
  must stay in sync. Re-exporting from `@menu/schemas` to the web package
  was tried and currently breaks Turbopack barrel resolution at SSR; if
  you fix that, you can collapse the two lists.
- `<MenuIcon>` falls back to `utensils` for unknown kinds, so adding a new
  icon kind is forward-compat (DB writes can land before the frontend
  ships the SVG case).
- Public layout (`web/src/app/[locale]/layout.tsx`) does NOT load Font
  Awesome — only the admin layout does. Public-facing icons must be
  inline SVG. If you add an admin-only feature, FA classes are fine.
- `setEntryMemberships()` in `backend/src/routes/admin.ts` is
  delete-then-insert. It is **not** transactional across the two
  statements. D1 doesn't support multi-statement transactions; if you
  refactor, keep the contract that the memberships set is fully
  replaced (not merged).
- Backend tests use seed helpers in `backend/src/__tests__/helpers/db.ts`:
  `seedMenu(db, id, code, title?, {published?, sortOrder?})`,
  `seedCategory(db, id, name?, sortOrder?)` (no `menuId` arg —
  categories are flat), `seedEntry(db, id, categoryId, {hidden?, ...})`,
  `seedMembership(db, menuId, entryId)`.
- Drizzle-kit's interactive `generate` was bypassed via a tiny Python
  PTY wrapper to feed Enter for the rename-vs-create-column prompt
  (we wanted "create"). If you regenerate migrations and don't have a
  TTY, do the same or write the SQL by hand and update `meta/_journal.json`
  + `meta/<n>_snapshot.json`.
- The git-shield pre-push hook flags drizzle snapshot UUIDs as secrets and
  Italian dish names as PII. The narrow allowlist regexes live in
  `.pii-allowlist`. New Italian fixtures may need additions.
