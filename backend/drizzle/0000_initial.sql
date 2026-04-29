CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_uid` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`payload` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_events_created_idx` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `catalog_views` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text,
	`date_bucket` integer NOT NULL,
	`session_hash` text NOT NULL,
	`viewed_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `menu_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_views_unique_idx` ON `catalog_views` (`entry_id`,`date_bucket`,`session_hash`);--> statement-breakpoint
CREATE INDEX `catalog_views_date_idx` ON `catalog_views` (`date_bucket`);--> statement-breakpoint
CREATE INDEX `catalog_views_viewed_at_idx` ON `catalog_views` (`viewed_at`);--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`messages` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`tool_calls` text DEFAULT '[]' NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_sessions_created_idx` ON `chat_sessions` (`created_at`);--> statement-breakpoint
CREATE INDEX `chat_sessions_uid_idx` ON `chat_sessions` (`uid`);--> statement-breakpoint
CREATE TABLE `menu_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`i18n` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `menu_categories_menu_order_idx` ON `menu_categories` (`menu_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `menu_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	`price_unit` text,
	`image_url` text,
	`out_of_stock` integer DEFAULT false NOT NULL,
	`frozen` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visibility` text DEFAULT 'all' NOT NULL,
	`allergens` text,
	`i18n` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `menu_entries_category_order_idx` ON `menu_entries` (`category_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `menu_extras` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'zeroorone' NOT NULL,
	`max` integer DEFAULT 1 NOT NULL,
	`options` text,
	`i18n` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `menu_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`selections` text,
	`i18n` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`i18n` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `menus_code_idx` ON `menus` (`code`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`name` text DEFAULT 'My Restaurant' NOT NULL,
	`payoff` text,
	`theme` text,
	`info` text,
	`socials` text,
	`opening_schedule` text,
	`promotion_alert` text,
	`chat_agent_prompt` text,
	`ai_chat_enabled` integer DEFAULT false NOT NULL,
	`enabled_locales` text,
	`disabled_locales` text,
	`custom_locales` text,
	`publication_state` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

--> statement-breakpoint
-- Seed the singleton settings row. The CHECK constraint on a future migration
-- can enforce id=1; for now, application code ensures we only ever read/write id=1.
INSERT INTO `settings` (`id`, `name`, `created_at`, `updated_at`)
VALUES (1, 'My Restaurant', strftime('%s','now')*1000, strftime('%s','now')*1000);
