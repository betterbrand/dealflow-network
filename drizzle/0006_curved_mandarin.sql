CREATE TABLE `authorizedUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`addedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authorizedUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorizedUsers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `authorizedUsers` ADD CONSTRAINT `authorizedUsers_addedBy_users_id_fk` FOREIGN KEY (`addedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;