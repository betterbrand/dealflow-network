-- Add new import-related columns to contacts table
ALTER TABLE `contacts` ADD COLUMN `lastImportedAt` TIMESTAMP NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `importSource` VARCHAR(50) NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `importStatus` VARCHAR(50) NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD COLUMN `opportunity` TEXT NULL;
