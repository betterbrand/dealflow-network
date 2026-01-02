/**
 * DELETE ALL CONTACTS - DEVELOPMENT/TESTING ONLY
 *
 * WARNING: This script deletes ALL contacts from the database.
 * DO NOT use in production. DO NOT commit to git.
 *
 * Run with: npx tsx delete-all-contacts.mjs
 */

import dotenv from 'dotenv';
dotenv.config();

import { getDb } from './server/db.js';
import { contacts, userContacts, contactContributions } from './drizzle/schema.js';

console.log('⚠️  WARNING: This will delete ALL contacts from the database!\n');

const database = await getDb();

if (!database) {
  console.error('Failed to connect to database');
  process.exit(1);
}

// Get count of contacts before deletion
const allContacts = await database.select().from(contacts);
const count = allContacts.length;

if (count === 0) {
  console.log('No contacts found in database.');
  process.exit(0);
}

console.log(`Found ${count} contact(s) to delete:\n`);
allContacts.forEach(contact => {
  console.log(`- ID: ${contact.id}, Name: ${contact.name}`);
});

console.log('\nDeleting all contacts and related data...');

// Delete in order due to foreign key constraints
// 1. Delete user-contact junction records
await database.delete(userContacts);
console.log('Deleted user-contact relationships');

// 2. Delete contact contributions
await database.delete(contactContributions);
console.log('Deleted contact contributions');

// 3. Delete all contacts
await database.delete(contacts);
console.log('Deleted all contacts');

console.log(`\nDone! Deleted ${count} contact(s) and related data.`);
process.exit(0);
