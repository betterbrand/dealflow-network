ALTER TABLE `contacts` ADD `followers` int;--> statement-breakpoint
ALTER TABLE `contacts` ADD `connections` int;--> statement-breakpoint
ALTER TABLE `contacts` ADD `bannerImageUrl` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `firstName` varchar(100);--> statement-breakpoint
ALTER TABLE `contacts` ADD `lastName` varchar(100);--> statement-breakpoint
ALTER TABLE `contacts` ADD `bioLinks` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `posts` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `activity` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `peopleAlsoViewed` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `linkedinId` varchar(100);--> statement-breakpoint
ALTER TABLE `contacts` ADD `linkedinNumId` varchar(100);--> statement-breakpoint
ALTER TABLE `contacts` ADD `city` varchar(255);--> statement-breakpoint
ALTER TABLE `contacts` ADD `countryCode` varchar(10);--> statement-breakpoint
ALTER TABLE `contacts` ADD `memorializedAccount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `contacts` ADD `educationDetails` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `honorsAndAwards` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `lastEnrichedAt` timestamp;--> statement-breakpoint
ALTER TABLE `contacts` ADD `enrichmentSource` varchar(50);