CREATE TABLE `contactContributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`userId` int NOT NULL,
	`fieldName` varchar(100) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`changeType` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contactContributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int NOT NULL,
	`privateNotes` text,
	`relationshipStrength` varchar(50),
	`howWeMet` text,
	`lastContactedAt` timestamp,
	`sentiment` varchar(50),
	`interestLevel` varchar(50),
	`conversationSummary` text,
	`actionItems` text,
	`eventId` int,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userContacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contacts` DROP FOREIGN KEY `contacts_addedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `contacts` DROP FOREIGN KEY `contacts_eventId_events_id_fk`;
--> statement-breakpoint
ALTER TABLE `contacts` ADD `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `contactContributions` ADD CONSTRAINT `contactContributions_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contactContributions` ADD CONSTRAINT `contactContributions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userContacts` ADD CONSTRAINT `userContacts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userContacts` ADD CONSTRAINT `userContacts_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userContacts` ADD CONSTRAINT `userContacts_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `notes`;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `conversationSummary`;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `actionItems`;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `sentiment`;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `interestLevel`;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `addedBy`;--> statement-breakpoint
ALTER TABLE `contacts` DROP COLUMN `eventId`;