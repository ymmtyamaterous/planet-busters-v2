CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `game_action` (
	`id` text PRIMARY KEY,
	`match_id` text NOT NULL,
	`actor_unit_id` text,
	`turn_number` integer NOT NULL,
	`side` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_game_action_match_id_game_match_id_fk` FOREIGN KEY (`match_id`) REFERENCES `game_match`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_action_actor_unit_id_game_unit_id_fk` FOREIGN KEY (`actor_unit_id`) REFERENCES `game_unit`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `game_match` (
	`id` text PRIMARY KEY,
	`status` text DEFAULT 'active' NOT NULL,
	`mode` text DEFAULT 'cpu' NOT NULL,
	`turn_side` text DEFAULT 'human' NOT NULL,
	`turn_number` integer DEFAULT 1 NOT NULL,
	`map_key` text NOT NULL,
	`map_seed` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`winner_side` text,
	`finish_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE TABLE `game_participant` (
	`id` text PRIMARY KEY,
	`match_id` text NOT NULL,
	`side` text NOT NULL,
	`user_id` text,
	`planet_x` integer NOT NULL,
	`planet_y` integer NOT NULL,
	`planet_hp` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_game_participant_match_id_game_match_id_fk` FOREIGN KEY (`match_id`) REFERENCES `game_match`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_participant_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `game_participant_match_side_unique` UNIQUE(`match_id`,`side`)
);
--> statement-breakpoint
CREATE TABLE `game_unit` (
	`id` text PRIMARY KEY,
	`match_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`kind` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`hp` integer NOT NULL,
	`is_destroyed` integer DEFAULT false NOT NULL,
	`has_acted` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_game_unit_match_id_game_match_id_fk` FOREIGN KEY (`match_id`) REFERENCES `game_match`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_unit_participant_id_game_participant_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `game_participant`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `game_action_match_created_at_idx` ON `game_action` (`match_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `game_action_match_turn_number_idx` ON `game_action` (`match_id`,`turn_number`);--> statement-breakpoint
CREATE INDEX `game_match_status_updated_at_idx` ON `game_match` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `game_participant_user_id_idx` ON `game_participant` (`user_id`);--> statement-breakpoint
CREATE INDEX `game_unit_match_id_idx` ON `game_unit` (`match_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);