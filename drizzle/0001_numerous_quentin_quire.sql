CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(255),
	`description` text,
	`industry` varchar(255),
	`location` varchar(255),
	`website` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contactPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`photoUrl` varchar(500) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contactPhotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contactRelationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromContactId` int NOT NULL,
	`toContactId` int NOT NULL,
	`relationshipType` varchar(100) NOT NULL,
	`strength` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contactRelationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`company` varchar(255),
	`role` varchar(255),
	`location` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`telegramUsername` varchar(255),
	`photoUrl` text,
	`notes` text,
	`conversationSummary` text,
	`actionItems` text,
	`sentiment` varchar(50),
	`interestLevel` varchar(50),
	`addedBy` int NOT NULL,
	`eventId` int,
	`companyId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`telegramChatId` varchar(255),
	`rawMessages` text,
	`capturedBy` int NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`date` timestamp,
	`location` varchar(500),
	`type` varchar(100),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `socialProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`platform` varchar(50) NOT NULL,
	`url` varchar(500) NOT NULL,
	`profileData` text,
	`lastEnriched` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `socialProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contactPhotos` ADD CONSTRAINT `contactPhotos_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contactPhotos` ADD CONSTRAINT `contactPhotos_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contactRelationships` ADD CONSTRAINT `contactRelationships_fromContactId_contacts_id_fk` FOREIGN KEY (`fromContactId`) REFERENCES `contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contactRelationships` ADD CONSTRAINT `contactRelationships_toContactId_contacts_id_fk` FOREIGN KEY (`toContactId`) REFERENCES `contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_addedBy_users_id_fk` FOREIGN KEY (`addedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_capturedBy_users_id_fk` FOREIGN KEY (`capturedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `socialProfiles` ADD CONSTRAINT `socialProfiles_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE cascade ON UPDATE no action;