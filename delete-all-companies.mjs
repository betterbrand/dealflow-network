/**
 * DELETE ALL COMPANIES - DEVELOPMENT/TESTING ONLY
 *
 * WARNING: This script deletes ALL companies from the database.
 * DO NOT use in production. DO NOT commit to git.
 *
 * Run with: npx tsx delete-all-companies.mjs
 */

import dotenv from 'dotenv';
dotenv.config();

import { eq } from 'drizzle-orm';
import { getDb } from './server/db.js';
import { companies, contacts } from './drizzle/schema.js';

console.log('⚠️  WARNING: This will delete ALL companies from the database!\n');

const database = await getDb();

if (!database) {
  console.error('Failed to connect to database');
  process.exit(1);
}

// Get count of companies before deletion
const allCompanies = await database.select().from(companies);
const count = allCompanies.length;

if (count === 0) {
  console.log('No companies found in database.');
  process.exit(0);
}

console.log(`Found ${count} company/companies to delete:\n`);
allCompanies.forEach(company => {
  console.log(`- ID: ${company.id}, Name: ${company.name}`);
});

console.log('\nDeleting all companies and updating related data...');

// Clear companyId references in contacts first (foreign key constraint)
const contactsWithCompany = await database
  .select({ id: contacts.id, name: contacts.name })
  .from(contacts)
  .where(eq(contacts.companyId, contacts.companyId)); // Get all with non-null companyId

// Update contacts to remove company references
for (const company of allCompanies) {
  await database
    .update(contacts)
    .set({ companyId: null })
    .where(eq(contacts.companyId, company.id));
}
console.log('Cleared company references from contacts');

// Delete all companies
await database.delete(companies);
console.log('Deleted all companies');

console.log(`\nDone! Deleted ${count} company/companies.`);
process.exit(0);
