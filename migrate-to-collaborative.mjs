/**
 * Migration script: Transform contacts to collaborative model
 * 
 * This script:
 * 1. Renames addedBy to createdBy in contacts table
 * 2. Migrates user-specific data (notes, sentiment, etc.) to userContacts table
 * 3. Creates initial contribution records for provenance tracking
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function migrate() {
  console.log('[Migration] Starting collaborative contacts migration...');
  
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);
  
  try {
    // Step 1: Create new tables
    console.log('[Migration] Creating new tables...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`contactContributions\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`contactId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`fieldName\` varchar(100) NOT NULL,
        \`oldValue\` text,
        \`newValue\` text,
        \`changeType\` varchar(50) NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`contactContributions_id\` PRIMARY KEY(\`id\`)
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`userContacts\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`contactId\` int NOT NULL,
        \`privateNotes\` text,
        \`relationshipStrength\` varchar(50),
        \`howWeMet\` text,
        \`lastContactedAt\` timestamp,
        \`sentiment\` varchar(50),
        \`interestLevel\` varchar(50),
        \`conversationSummary\` text,
        \`actionItems\` text,
        \`eventId\` int,
        \`addedAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`userContacts_id\` PRIMARY KEY(\`id\`)
      )
    `);
    
    console.log('[Migration] New tables created successfully');
    
    // Step 2: Rename addedBy to createdBy
    console.log('[Migration] Renaming addedBy to createdBy...');
    
    await connection.query(`
      ALTER TABLE \`contacts\` CHANGE COLUMN \`addedBy\` \`createdBy\` int NOT NULL
    `);
    
    console.log('[Migration] Column renamed successfully');
    
    // Step 3: Migrate user-specific data to userContacts
    console.log('[Migration] Migrating user-specific data to userContacts...');
    
    const [existingContacts] = await connection.query(`
      SELECT id, createdBy, notes, conversationSummary, actionItems, 
             sentiment, interestLevel, eventId, createdAt
      FROM contacts
    `);
    
    console.log(`[Migration] Found ${existingContacts.length} contacts to migrate`);
    
    for (const contact of existingContacts) {
      await connection.query(`
        INSERT INTO userContacts 
        (userId, contactId, privateNotes, conversationSummary, actionItems, 
         sentiment, interestLevel, eventId, addedAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        contact.createdBy,
        contact.id,
        contact.notes,
        contact.conversationSummary,
        contact.actionItems,
        contact.sentiment,
        contact.interestLevel,
        contact.eventId,
        contact.createdAt,
        contact.createdAt
      ]);
      
      // Create initial contribution record
      await connection.query(`
        INSERT INTO contactContributions 
        (contactId, userId, fieldName, newValue, changeType, createdAt)
        VALUES (?, ?, 'contact', 'Initial contact creation', 'created', ?)
      `, [contact.id, contact.createdBy, contact.createdAt]);
    }
    
    console.log('[Migration] User-specific data migrated successfully');
    
    // Step 4: Drop old columns from contacts
    console.log('[Migration] Dropping old columns from contacts table...');
    
    await connection.query(`ALTER TABLE contacts DROP FOREIGN KEY IF EXISTS contacts_eventId_events_id_fk`);
    await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS notes`);
    await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS conversationSummary`);
    await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS actionItems`);
    await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS sentiment`);
    await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS interestLevel`);
    await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS eventId`);
    
    console.log('[Migration] Old columns dropped successfully');
    
    // Step 5: Add foreign key constraints
    console.log('[Migration] Adding foreign key constraints...');
    
    await connection.query(`
      ALTER TABLE contactContributions 
      ADD CONSTRAINT contactContributions_contactId_contacts_id_fk 
      FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE CASCADE
    `);
    
    await connection.query(`
      ALTER TABLE contactContributions 
      ADD CONSTRAINT contactContributions_userId_users_id_fk 
      FOREIGN KEY (userId) REFERENCES users(id)
    `);
    
    await connection.query(`
      ALTER TABLE userContacts 
      ADD CONSTRAINT userContacts_userId_users_id_fk 
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    `);
    
    await connection.query(`
      ALTER TABLE userContacts 
      ADD CONSTRAINT userContacts_contactId_contacts_id_fk 
      FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE CASCADE
    `);
    
    await connection.query(`
      ALTER TABLE userContacts 
      ADD CONSTRAINT userContacts_eventId_events_id_fk 
      FOREIGN KEY (eventId) REFERENCES events(id)
    `);
    
    await connection.query(`
      ALTER TABLE contacts 
      ADD CONSTRAINT contacts_createdBy_users_id_fk 
      FOREIGN KEY (createdBy) REFERENCES users(id)
    `);
    
    console.log('[Migration] Foreign key constraints added successfully');
    
    console.log('[Migration] ✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
