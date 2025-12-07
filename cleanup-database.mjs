/**
 * Database cleanup script
 * Reverts the contacts table to original schema and removes partial migration artifacts
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function cleanup() {
  console.log('[Cleanup] Starting database cleanup...');
  
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Step 1: Drop foreign key constraints
    console.log('[Cleanup] Dropping foreign key constraints...');
    
    try {
      await connection.query(`ALTER TABLE contacts DROP FOREIGN KEY IF EXISTS contacts_createdBy_users_id_fk`);
      await connection.query(`ALTER TABLE contacts DROP FOREIGN KEY IF EXISTS contacts_addedBy_users_id_fk`);
    } catch (error) {
      console.log('[Cleanup] Some constraints may not exist, continuing...');
    }
    
    // Step 2: Drop temporary tables
    console.log('[Cleanup] Dropping temporary tables...');
    
    await connection.query(`DROP TABLE IF EXISTS userContacts`);
    await connection.query(`DROP TABLE IF EXISTS contactContributions`);
    
    // Step 3: Check current columns
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'contacts' 
      AND COLUMN_NAME IN ('addedBy', 'createdBy', 'notes', 'conversationSummary', 'actionItems', 'sentiment', 'interestLevel', 'eventId')
    `);
    
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    console.log('[Cleanup] Existing columns:', existingColumns);
    
    // Step 4: Restore original schema
    console.log('[Cleanup] Restoring original schema...');
    
    // If createdBy exists but addedBy doesn't, rename it back
    if (existingColumns.includes('createdBy') && !existingColumns.includes('addedBy')) {
      await connection.query(`ALTER TABLE contacts CHANGE COLUMN createdBy addedBy int NOT NULL`);
      console.log('[Cleanup] Renamed createdBy back to addedBy');
    }
    
    // Drop createdBy if both exist
    if (existingColumns.includes('createdBy') && existingColumns.includes('addedBy')) {
      await connection.query(`ALTER TABLE contacts DROP COLUMN createdBy`);
      console.log('[Cleanup] Dropped duplicate createdBy column');
    }
    
    // Add missing columns if they don't exist
    if (!existingColumns.includes('notes')) {
      await connection.query(`ALTER TABLE contacts ADD COLUMN notes text`);
      console.log('[Cleanup] Added notes column');
    }
    
    if (!existingColumns.includes('conversationSummary')) {
      await connection.query(`ALTER TABLE contacts ADD COLUMN conversationSummary text`);
      console.log('[Cleanup] Added conversationSummary column');
    }
    
    if (!existingColumns.includes('actionItems')) {
      await connection.query(`ALTER TABLE contacts ADD COLUMN actionItems text`);
      console.log('[Cleanup] Added actionItems column');
    }
    
    if (!existingColumns.includes('sentiment')) {
      await connection.query(`ALTER TABLE contacts ADD COLUMN sentiment varchar(50)`);
      console.log('[Cleanup] Added sentiment column');
    }
    
    if (!existingColumns.includes('interestLevel')) {
      await connection.query(`ALTER TABLE contacts ADD COLUMN interestLevel varchar(50)`);
      console.log('[Cleanup] Added interestLevel column');
    }
    
    if (!existingColumns.includes('eventId')) {
      await connection.query(`ALTER TABLE contacts ADD COLUMN eventId int`);
      console.log('[Cleanup] Added eventId column');
    }
    
    // Step 5: Restore foreign keys
    console.log('[Cleanup] Restoring foreign key constraints...');
    
    await connection.query(`
      ALTER TABLE contacts 
      ADD CONSTRAINT contacts_addedBy_users_id_fk 
      FOREIGN KEY (addedBy) REFERENCES users(id)
    `);
    
    await connection.query(`
      ALTER TABLE contacts 
      ADD CONSTRAINT contacts_eventId_events_id_fk 
      FOREIGN KEY (eventId) REFERENCES events(id)
    `);
    
    // Step 6: Clear all contacts
    console.log('[Cleanup] Clearing all existing contacts...');
    
    await connection.query(`DELETE FROM contacts`);
    
    console.log('[Cleanup] ✅ Database cleanup completed successfully!');
    console.log('[Cleanup] Schema restored to original state');
    console.log('[Cleanup] All contacts cleared');
    
  } catch (error) {
    console.error('[Cleanup] ❌ Cleanup failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

cleanup().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
