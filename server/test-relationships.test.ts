import { describe, it, expect, beforeAll } from 'vitest';
import { createRelationship, getRelationshipsForContact, deleteRelationship } from './db';
import { getDb } from './db';
import { contacts, contactRelationships } from '../drizzle/schema';

describe('Relationship Management', () => {
  let testContactId1: number;
  let testContactId2: number;
  let testRelationshipId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test contacts
    const [contact1] = await db.insert(contacts).values({
      name: 'Test Contact 1',
      company: 'Test Company 1',
      addedBy: 1,
    }).$returningId();

    const [contact2] = await db.insert(contacts).values({
      name: 'Test Contact 2',
      company: 'Test Company 2',
      addedBy: 1,
    }).$returningId();

    testContactId1 = contact1.id;
    testContactId2 = contact2.id;
  });

  it('should create a relationship between two contacts', async () => {
    const result = await createRelationship({
      fromContactId: testContactId1,
      toContactId: testContactId2,
      relationshipType: 'works_with',
      notes: 'Test relationship',
    });

    expect(result).toBeDefined();
    expect(result.insertId).toBeGreaterThan(0);
    testRelationshipId = Number(result.insertId);
  });

  it('should retrieve relationships for a contact', async () => {
    const relationships = await getRelationshipsForContact(testContactId1);

    expect(relationships).toBeDefined();
    expect(relationships.length).toBeGreaterThan(0);
    
    const relationship = relationships[0];
    expect(relationship.relationshipType).toBe('works_with');
    expect(relationship.relatedContact).toBeDefined();
    expect(relationship.relatedContact.name).toBe('Test Contact 2');
  });

  it('should delete a relationship', async () => {
    const result = await deleteRelationship(testRelationshipId);
    expect(result.success).toBe(true);

    // Verify deletion
    const relationships = await getRelationshipsForContact(testContactId1);
    expect(relationships.length).toBe(0);
  });

  it('should handle bidirectional relationship queries', async () => {
    // Create a relationship from contact2 to contact1
    await createRelationship({
      fromContactId: testContactId2,
      toContactId: testContactId1,
      relationshipType: 'introduced_by',
    });

    // Query from contact1's perspective (should see incoming relationship)
    const relationshipsForContact1 = await getRelationshipsForContact(testContactId1);
    expect(relationshipsForContact1.length).toBeGreaterThan(0);
    
    const incomingRel = relationshipsForContact1.find(r => r.direction === 'incoming');
    expect(incomingRel).toBeDefined();
    expect(incomingRel?.relationshipType).toBe('introduced_by');
  });
});
