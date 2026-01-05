-- Drop and recreate contactAccessRequests with new schema
DROP TABLE IF EXISTS `contact_access_requests`;--> statement-breakpoint

-- Create notifications table
CREATE TABLE `notifications` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` int NOT NULL,
  `type` enum('contact_access_request', 'contact_access_approved', 'contact_access_denied') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text,
  `action_url` varchar(500),
  `is_read` int DEFAULT 0 NOT NULL,
  `contact_id` int,
  `access_request_id` int,
  `created_at` timestamp DEFAULT (now()) NOT NULL,
  `read_at` timestamp,
  CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  CONSTRAINT `notifications_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE set null,
  INDEX `idx_notif_user_unread` (`user_id`, `is_read`)
);--> statement-breakpoint

-- Create contactAccessRequests with new schema
CREATE TABLE `contact_access_requests` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `contact_id` int NOT NULL,
  `requester_id` int NOT NULL,
  `status` enum('pending', 'approved', 'denied') DEFAULT 'pending' NOT NULL,
  `message` text,
  `created_at` timestamp DEFAULT (now()) NOT NULL,
  `responded_at` timestamp,
  `responded_by` int,
  CONSTRAINT `contact_access_requests_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE cascade,
  CONSTRAINT `contact_access_requests_requester_id_users_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  CONSTRAINT `contact_access_requests_responded_by_users_id_fk` FOREIGN KEY (`responded_by`) REFERENCES `users`(`id`) ON DELETE set null,
  INDEX `idx_car_unique` (`contact_id`, `requester_id`),
  INDEX `idx_car_status` (`status`),
  INDEX `idx_car_requester` (`requester_id`),
  INDEX `idx_car_contact` (`contact_id`)
);--> statement-breakpoint

-- Add isPrivate column to contacts
ALTER TABLE `contacts` ADD COLUMN `is_private` int DEFAULT 0 NOT NULL;--> statement-breakpoint

-- Add indexes for isPrivate
CREATE INDEX `idx_contacts_is_private` ON `contacts` (`is_private`);--> statement-breakpoint
CREATE INDEX `idx_contacts_created_private` ON `contacts` (`createdBy`, `is_private`);
