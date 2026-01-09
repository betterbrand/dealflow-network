/**
 * Run Twitter integration migration
 * Usage: npx tsx scripts/run-twitter-migration.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

async function runMigration() {
  console.log("Connecting to database...");

  const connection = await mysql.createConnection(DATABASE_URL!);
  const db = drizzle(connection);

  const migrations = [
    // Add Twitter columns to contacts (one at a time to handle existing columns)
    { name: "twitterUsername", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterUsername` VARCHAR(50)" },
    { name: "twitterId", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterId` VARCHAR(50)" },
    { name: "twitterBio", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterBio` TEXT" },
    { name: "twitterFollowers", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterFollowers` INT" },
    { name: "twitterFollowing", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterFollowing` INT" },
    { name: "twitterTweetCount", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterTweetCount` INT" },
    { name: "twitterVerified", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterVerified` INT DEFAULT 0" },
    { name: "twitterProfileImageUrl", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterProfileImageUrl` TEXT" },
    { name: "twitterBannerUrl", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterBannerUrl` TEXT" },
    { name: "twitterJoinedAt", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterJoinedAt` TIMESTAMP NULL" },
    { name: "twitterLocation", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterLocation` VARCHAR(255)" },
    { name: "twitterWebsite", sql: "ALTER TABLE `contacts` ADD COLUMN `twitterWebsite` VARCHAR(500)" },
  ];

  // Run column additions
  for (const migration of migrations) {
    try {
      await connection.execute(migration.sql);
      console.log(`✓ Added column: ${migration.name}`);
    } catch (error: any) {
      if (error.code === "ER_DUP_FIELDNAME") {
        console.log(`- Column already exists: ${migration.name}`);
      } else {
        console.error(`✗ Failed to add ${migration.name}:`, error.message);
      }
    }
  }

  // Add indexes (ignore if already exist)
  const indexes = [
    { name: "idx_contacts_twitter", sql: "CREATE INDEX `idx_contacts_twitter` ON `contacts` (`twitterUrl`)" },
    { name: "idx_contacts_twitter_username", sql: "CREATE INDEX `idx_contacts_twitter_username` ON `contacts` (`twitterUsername`)" },
  ];

  for (const idx of indexes) {
    try {
      await connection.execute(idx.sql);
      console.log(`✓ Created index: ${idx.name}`);
    } catch (error: any) {
      if (error.code === "ER_DUP_KEYNAME") {
        console.log(`- Index already exists: ${idx.name}`);
      } else {
        console.error(`✗ Failed to create index ${idx.name}:`, error.message);
      }
    }
  }

  // Create twitterAnalysis table
  try {
    await connection.execute(`
      CREATE TABLE \`twitterAnalysis\` (
        \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`contactId\` INT NOT NULL,
        \`tweetCount\` INT DEFAULT 0,
        \`analyzedTweetIds\` TEXT,
        \`overallSentiment\` VARCHAR(20),
        \`sentimentScore\` INT,
        \`opportunities\` TEXT,
        \`goals\` TEXT,
        \`topics\` TEXT,
        \`capabilities\` TEXT,
        \`needs\` TEXT,
        \`communicationStyle\` VARCHAR(50),
        \`personalityTraits\` TEXT,
        \`influenceScore\` INT,
        \`influenceTopics\` TEXT,
        \`engagementPattern\` TEXT,
        \`lastAnalyzedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`analysisVersion\` VARCHAR(20) DEFAULT '1.0',
        \`rawAnalysis\` TEXT,
        \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`twitterAnalysis_contactId_contacts_id_fk\` FOREIGN KEY (\`contactId\`) REFERENCES \`contacts\` (\`id\`) ON DELETE CASCADE
      )
    `);
    console.log("✓ Created table: twitterAnalysis");
  } catch (error: any) {
    if (error.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("- Table already exists: twitterAnalysis");
    } else {
      console.error("✗ Failed to create twitterAnalysis table:", error.message);
    }
  }

  // Create indexes for twitterAnalysis
  const analysisIndexes = [
    { name: "idx_twitter_analysis_contact", sql: "CREATE INDEX `idx_twitter_analysis_contact` ON `twitterAnalysis` (`contactId`)" },
    { name: "idx_twitter_analysis_sentiment", sql: "CREATE INDEX `idx_twitter_analysis_sentiment` ON `twitterAnalysis` (`overallSentiment`)" },
    { name: "idx_twitter_analysis_influence", sql: "CREATE INDEX `idx_twitter_analysis_influence` ON `twitterAnalysis` (`influenceScore`)" },
  ];

  for (const idx of analysisIndexes) {
    try {
      await connection.execute(idx.sql);
      console.log(`✓ Created index: ${idx.name}`);
    } catch (error: any) {
      if (error.code === "ER_DUP_KEYNAME") {
        console.log(`- Index already exists: ${idx.name}`);
      } else {
        console.error(`✗ Failed to create index ${idx.name}:`, error.message);
      }
    }
  }

  await connection.end();
  console.log("\nMigration complete!");
}

runMigration().catch(console.error);
