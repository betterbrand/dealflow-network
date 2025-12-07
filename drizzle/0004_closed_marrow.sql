CREATE TABLE `queryHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`query` text NOT NULL,
	`intent` varchar(50),
	`resultCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `queryHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `queryHistory` ADD CONSTRAINT `queryHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;