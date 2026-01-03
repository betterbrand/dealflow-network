#!/usr/bin/env node

/**
 * Infer edges between contacts based on shared attributes
 * Run with: npx tsx infer-edges.js
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { contacts, inferredEdges, userContacts, users } from './drizzle/schema.js';
import { sql } from 'drizzle-orm';

async function inferEdges() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log('🔍 Inferring edges from contact data...\n');

  // Get the first user
  const allUsers = await db.select().from(users).limit(1);
  if (allUsers.length === 0) {
    console.error('❌ No users found!');
    await connection.end();
    process.exit(1);
  }
  const user = allUsers[0];

  // Get all contacts for this user
  const userContactsData = await db
    .select({
      contactId: userContacts.contactId,
      contact: contacts,
    })
    .from(userContacts)
    .innerJoin(contacts, sql`${userContacts.contactId} = ${contacts.id}`)
    .where(sql`${userContacts.userId} = ${user.id}`);

  const allContacts = userContactsData.map(uc => uc.contact);
  console.log(`📇 Found ${allContacts.length} contacts for user ${user.email}\n`);

  if (allContacts.length < 2) {
    console.log('ℹ️  Need at least 2 contacts to infer edges.');
    await connection.end();
    process.exit(0);
  }

  let edgesCreated = 0;
  const edgesToCreate = [];

  // Infer edges based on shared attributes
  for (let i = 0; i < allContacts.length; i++) {
    for (let j = i + 1; j < allContacts.length; j++) {
      const contact1 = allContacts[i];
      const contact2 = allContacts[j];

      // Same company edge
      if (contact1.company && contact2.company &&
          contact1.company.toLowerCase().trim() === contact2.company.toLowerCase().trim()) {
        edgesToCreate.push({
          fromContactId: contact1.id,
          toContactId: contact2.id,
          edgeType: 'same_company',
          strength: 3,
          metadata: JSON.stringify({ company: contact1.company }),
          createdAt: new Date(),
        });
        console.log(`🏢 Same company: ${contact1.name} ↔ ${contact2.name} (${contact1.company})`);
      }

      // Shared skills edge
      if (contact1.skills && contact2.skills) {
        try {
          const skills1 = typeof contact1.skills === 'string' ? JSON.parse(contact1.skills) : contact1.skills;
          const skills2 = typeof contact2.skills === 'string' ? JSON.parse(contact2.skills) : contact2.skills;

          if (Array.isArray(skills1) && Array.isArray(skills2)) {
            const sharedSkills = skills1.filter(s => skills2.includes(s));
            if (sharedSkills.length >= 2) {
              edgesToCreate.push({
                fromContactId: contact1.id,
                toContactId: contact2.id,
                edgeType: 'shared_skills',
                strength: sharedSkills.length,
                metadata: JSON.stringify({ skills: sharedSkills }),
                createdAt: new Date(),
              });
              console.log(`💡 Shared skills: ${contact1.name} ↔ ${contact2.name} (${sharedSkills.length} skills)`);
            }
          }
        } catch (e) {
          // Skip if skills parsing fails
        }
      }

      // Same school edge
      if (contact1.education && contact2.education) {
        try {
          const edu1 = typeof contact1.education === 'string' ? JSON.parse(contact1.education) : contact1.education;
          const edu2 = typeof contact2.education === 'string' ? JSON.parse(contact2.education) : contact2.education;

          if (Array.isArray(edu1) && Array.isArray(edu2)) {
            const schools1 = edu1.map(e => e.school?.toLowerCase().trim()).filter(Boolean);
            const schools2 = edu2.map(e => e.school?.toLowerCase().trim()).filter(Boolean);
            const sharedSchools = schools1.filter(s => schools2.includes(s));

            if (sharedSchools.length > 0) {
              edgesToCreate.push({
                fromContactId: contact1.id,
                toContactId: contact2.id,
                edgeType: 'same_school',
                strength: 4,
                metadata: JSON.stringify({ schools: sharedSchools }),
                createdAt: new Date(),
              });
              console.log(`🎓 Same school: ${contact1.name} ↔ ${contact2.name} (${sharedSchools[0]})`);
            }
          }
        } catch (e) {
          // Skip if education parsing fails
        }
      }
    }
  }

  // Insert all inferred edges
  if (edgesToCreate.length > 0) {
    for (const edge of edgesToCreate) {
      try {
        // Just insert - duplicate constraint will prevent duplicates
        await db.insert(inferredEdges).values(edge);
        edgesCreated++;
      } catch (error) {
        // Skip if duplicate (likely already exists)
        if (!error.message.includes('Duplicate')) {
          console.error(`✗ Failed to create edge:`, error.message);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Edge inference complete!`);
  console.log(`   Edges created: ${edgesCreated}`);
  console.log('='.repeat(60));

  await connection.end();
}

inferEdges().catch(console.error);
