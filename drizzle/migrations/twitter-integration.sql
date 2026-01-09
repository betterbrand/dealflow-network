-- Twitter Integration Migration
-- Run this manually: mysql -u user -p database < drizzle/migrations/twitter-integration.sql

-- Add Twitter fields to contacts table
ALTER TABLE `contacts`
ADD COLUMN `twitterUsername` VARCHAR(50),
ADD COLUMN `twitterId` VARCHAR(50),
ADD COLUMN `twitterBio` TEXT,
ADD COLUMN `twitterFollowers` INT,
ADD COLUMN `twitterFollowing` INT,
ADD COLUMN `twitterTweetCount` INT,
ADD COLUMN `twitterVerified` INT DEFAULT 0,
ADD COLUMN `twitterProfileImageUrl` TEXT,
ADD COLUMN `twitterBannerUrl` TEXT,
ADD COLUMN `twitterJoinedAt` TIMESTAMP NULL,
ADD COLUMN `twitterLocation` VARCHAR(255),
ADD COLUMN `twitterWebsite` VARCHAR(500);

-- Add indexes for Twitter URL deduplication
CREATE INDEX `idx_contacts_twitter` ON `contacts` (`twitterUrl`);
CREATE INDEX `idx_contacts_twitter_username` ON `contacts` (`twitterUsername`);

-- Create twitterAnalysis table for LLM-derived insights
CREATE TABLE `twitterAnalysis` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `contactId` INT NOT NULL,
  `tweetCount` INT DEFAULT 0,
  `analyzedTweetIds` TEXT,
  `overallSentiment` VARCHAR(20),
  `sentimentScore` INT,
  `opportunities` TEXT,
  `goals` TEXT,
  `topics` TEXT,
  `capabilities` TEXT,
  `needs` TEXT,
  `communicationStyle` VARCHAR(50),
  `personalityTraits` TEXT,
  `influenceScore` INT,
  `influenceTopics` TEXT,
  `engagementPattern` TEXT,
  `lastAnalyzedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `analysisVersion` VARCHAR(20) DEFAULT '1.0',
  `rawAnalysis` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `twitterAnalysis_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts` (`id`) ON DELETE CASCADE
);

-- Add indexes for twitterAnalysis
CREATE INDEX `idx_twitter_analysis_contact` ON `twitterAnalysis` (`contactId`);
CREATE INDEX `idx_twitter_analysis_sentiment` ON `twitterAnalysis` (`overallSentiment`);
CREATE INDEX `idx_twitter_analysis_influence` ON `twitterAnalysis` (`influenceScore`);
