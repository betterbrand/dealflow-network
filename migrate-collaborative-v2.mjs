/**
 * Collaborative Contacts Migration Script v2
 * 
 * This script safely transforms the contacts table to a collaborative model:
 * 1. Creates new tables (userContacts, contactContributions)
 * 2. Renames addedBy to createdBy
 * 3. Migrates user-specific data to userContacts
 * 4. Creates initial contribution records
 * 5. Removes old columns from contacts
 * 
 * SAFETY: This script can be run multiple times safely (idempotent)
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function migrate() {
  console.log('[Migration] Starting collaborative contacts migration v2...');
  
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Step 1: Create new tables if they don't exist
    console.log('[Migration] Step 1: Creating new tables...');
    
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
    
    console.log('[Migration] ✓ Tables created');
    
    // Step 2: Check if migration is needed
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'contacts' 
      AND COLUMN_NAME IN ('addedBy', 'createdBy', 'notes', 'conversationSummary')
    `);
    
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    console.log('[Migration] Existing columns:', existingColumns);
    
    const hasAddedBy = existingColumns.includes('addedBy');
    const hasCreatedBy = existingColumns.includes('createdBy');
    const hasNotes = existingColumns.includes('notes');
    
    if (!hasAddedBy && hasCreatedBy && !hasNotes) {
      console.log('[Migration] ⚠️  Migration already completed, skipping...');
      return;
    }
    
    // Step 3: Migrate user-specific data to userContacts
    console.log('[Migration] Step 2: Migrating user-specific data...');
    
    const [existingContacts] = await connection.query(`
      SELECT id, addedBy, notes, conversationSummary, actionItems, 
             sentiment, interestLevel, eventId, createdAt
      FROM contacts
    `);
    
    console.log(`[Migration] Found ${existingContacts.length} contacts to migrate`);
    
    for (const contact of existingContacts) {
      // Check if already migrated
      const [existing] = await connection.query(
        `SELECT id FROM userContacts WHERE userId = ? AND contactId = ?`,
        [contact.addedBy, contact.id]
      );
      
      if (existing.length > 0) {
        console.log(`[Migration] Contact ${contact.id} already migrated, skipping...`);
        continue;
      }
      
      await connection.query(`
        INSERT INTO userContacts 
        (userId, contactId, privateNotes, conversationSummary, actionItems, 
         sentiment, interestLevel, eventId, addedAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        contact.addedBy,
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
      `, [contact.id, contact.addedBy, contact.createdAt]);
    }
    
    console.log('[Migration] ✓ User-specific data migrated');
    
    // Step 4: Rename addedBy to createdBy
    console.log('[Migration] Step 3: Renaming addedBy to createdBy...');
    
    if (hasAddedBy && !hasCreatedBy) {
      await connection.query(`
        ALTER TABLE \`contacts\` CHANGE COLUMN \`addedBy\` \`createdBy\` int NOT NULL
      `);
      console.log('[Migration] ✓ Column renamed');
    } else if (hasAddedBy && hasCreatedBy) {
      // Both exist, drop addedBy
      await connection.query(`ALTER TABLE \`contacts\` DROP COLUMN \`addedBy\``);
      console.log('[Migration] ✓ Duplicate addedBy column dropped');
    }
    
    // Step 5: Drop old columns
    console.log('[Migration] Step 4: Dropping old columns...');
    
    try {
      await connection.query(`ALTER TABLE contacts DROP FOREIGN KEY IF EXISTS contacts_eventId_events_id_fk`);
    } catch (e) {
      console.log('[Migration] Foreign key may not exist, continuing...');
    }
    
    if (hasNotes) {
      await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS notes`);
      await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS conversationSummary`);
      await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS actionItems`);
      await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS sentiment`);
      await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS interestLevel`);
      await connection.query(`ALTER TABLE contacts DROP COLUMN IF EXISTS eventId`);
      console.log('[Migration] ✓ Old columns dropped');
    }
    
    // Step 6: Add foreign key constraints
    console.log('[Migration] Step 5: Adding foreign key constraints...');
    
    // Check if constraints already exist
    const [fkCheck] = await connection.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_NAME = 'userContacts' 
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    
    if (fkCheck.length === 0) {
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
        ALTER TABLE contacts 
        ADD CONSTRAINT contacts_createdBy_users_id_fk 
        FOREIGN KEY (createdBy) REFERENCES users(id)
      `);
      
      console.log('[Migration] ✓ Foreign key constraints added');
    } else {
      console.log('[Migration] ✓ Foreign key constraints already exist');
    }
    
    console.log('[Migration] ✅ Migration completed successfully!');
    console.log('[Migration] Summary:');
    console.log(`  - Migrated ${existingContacts.length} contacts to collaborative model`);
    console.log(`  - Created userContacts entries for user-specific data`);
    console.log(`  - Created contribution records for provenance tracking`);
    
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
