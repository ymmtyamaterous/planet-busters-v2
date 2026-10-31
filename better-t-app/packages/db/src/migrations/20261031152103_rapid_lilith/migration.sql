ALTER TABLE `game_match` ADD `rules_version` text DEFAULT 'v1' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_match` ADD `map_version` text DEFAULT 'v1' NOT NULL;