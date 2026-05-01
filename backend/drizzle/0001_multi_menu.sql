CREATE TABLE `menu_entry_memberships` (
	`menu_id` text NOT NULL,
	`entry_id` text NOT NULL,
	PRIMARY KEY(`menu_id`, `entry_id`),
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entry_id`) REFERENCES `menu_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `menu_entry_memberships_entry_idx` ON `menu_entry_memberships` (`entry_id`);--> statement-breakpoint
ALTER TABLE `menu_entries` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `menus` ADD `published` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `menus` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `menus_sort_idx` ON `menus` (`sort_order`);--> statement-breakpoint
-- ── Data backfill ─────────────────────────────────────────────────────────────
-- Seed memberships from the legacy entry-level visibility flag:
--   'all'      → membership for every existing menu
--   '<code>'   → membership for the menu whose code matches (e.g. 'seated', 'takeaway')
--   'hidden'   → no memberships, and entry.hidden = 1 (set below)
INSERT INTO `menu_entry_memberships` (`menu_id`, `entry_id`)
SELECT m.`id`, e.`id`
FROM `menu_entries` e
CROSS JOIN `menus` m
WHERE e.`visibility` = 'all' OR e.`visibility` = m.`code`;--> statement-breakpoint
UPDATE `menu_entries` SET `hidden` = 1 WHERE `visibility` = 'hidden';--> statement-breakpoint
-- Order legacy menus: seated first, takeaway second, anything else third (stable enough — only matters for the two legacy codes).
UPDATE `menus` SET `sort_order` = CASE
  WHEN `code` = 'seated' THEN 0
  WHEN `code` = 'takeaway' THEN 1
  ELSE 2
END;--> statement-breakpoint
-- Collapse settings.opening_schedule from {seated, takeaway} to a single WorkingHours.
-- Prefer the 'seated' value; fall back to 'takeaway' if seated is absent.
UPDATE `settings`
SET `opening_schedule` = json_extract(`opening_schedule`, '$.seated')
WHERE `id` = 1
  AND `opening_schedule` IS NOT NULL
  AND json_type(`opening_schedule`, '$.seated') IS NOT NULL;--> statement-breakpoint
UPDATE `settings`
SET `opening_schedule` = json_extract(`opening_schedule`, '$.takeaway')
WHERE `id` = 1
  AND `opening_schedule` IS NOT NULL
  AND json_type(`opening_schedule`, '$.takeaway') IS NOT NULL
  AND json_type(`opening_schedule`, '$.seated') IS NULL;--> statement-breakpoint
-- ── Schema cleanup ────────────────────────────────────────────────────────────
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_menu_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`i18n` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_menu_categories`("id", "name", "sort_order", "i18n", "created_at", "updated_at") SELECT "id", "name", "sort_order", "i18n", "created_at", "updated_at" FROM `menu_categories`;--> statement-breakpoint
DROP TABLE `menu_categories`;--> statement-breakpoint
ALTER TABLE `__new_menu_categories` RENAME TO `menu_categories`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `menu_categories_sort_order_idx` ON `menu_categories` (`sort_order`);--> statement-breakpoint
ALTER TABLE `menu_entries` DROP COLUMN `visibility`;
