/**
 * Migration script to add profile columns to users table
 * Run with: npx tsx scripts/migrate-user-profile.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";

const columns: [string, string][] = [
  ['phone', 'VARCHAR(50)'],
  ['telegramUsername', 'VARCHAR(255)'],
  ['company', 'VARCHAR(255)'],
  ['jobTitle', 'VARCHAR(255)'],
  ['location', 'VARCHAR(255)'],
  ['linkedinUrl', 'VARCHAR(500)'],
  ['twitterUrl', 'VARCHAR(500)'],
  ['bio', 'TEXT'],
  ['profilePictureUrl', 'TEXT'],
  ['bannerImageUrl', 'TEXT'],
  ['firstName', 'VARCHAR(100)'],
  ['lastName', 'VARCHAR(100)'],
  ['experience', 'TEXT'],
  ['education', 'TEXT'],
  ['skills', 'TEXT'],
  ['followers', 'INT'],
  ['connections', 'INT'],
  ['bioLinks', 'TEXT'],
  ['posts', 'TEXT'],
  ['activity', 'TEXT'],
  ['linkedinId', 'VARCHAR(100)'],
  ['linkedinNumId', 'VARCHAR(100)'],
  ['city', 'VARCHAR(255)'],
  ['countryCode', 'VARCHAR(10)'],
  ['lastImportedAt', 'TIMESTAMP NULL'],
  ['importSource', 'VARCHAR(50)'],
];

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const pool = mysql.createPool(process.env.DATABASE_URL);
  const db = drizzle(pool);

  console.log("Adding user profile columns...\n");

  for (const [colName, colType] of columns) {
    try {
      await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN \`${colName}\` ${colType} NULL`));
      console.log(`  ✓ Added: ${colName}`);
    } catch (e: any) {
      if (e.cause?.code === 'ER_DUP_FIELDNAME') {
        console.log(`  - Exists: ${colName}`);
      } else {
        console.log(`  ✗ Error: ${colName} - ${e.cause?.message || e.message}`);
      }
    }
  }

  console.log("\nMigration complete!");
  await pool.end();
  process.exit(0);
}

migrate().catch(console.error);
