import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRelationship, getRelationshipsForContact, deleteRelationship, getDb } from './db';
import { contacts, contactRelationships } from '../drizzle/schema';
import { eq, or } from 'drizzle-orm';

// Skip in CI or if no database URL - these are integration tests
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(isCI || !hasDb)('Relationship Management', () => {
  let testContactId1: number;
  let testContactId2: number;
  let testRelationshipId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Create test contacts with unique names to avoid conflicts
    const timestamp = Date.now();
    const [contact1] = await db.insert(contacts).values({
      name: `Test Contact 1 - ${timestamp}`,
      company: 'Test Company 1',
      createdBy: 1,
    }).$returningId();

    const [contact2] = await db.insert(contacts).values({
      name: `Test Contact 2 - ${timestamp}`,
      company: 'Test Company 2',
      createdBy: 1,
    }).$returningId();

    testContactId1 = contact1.id;
    testContactId2 = contact2.id;
  }, 30000); // 30s timeout for setup

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test relationships
    await db.delete(contactRelationships).where(
      or(
        eq(contactRelationships.fromContactId, testContactId1),
        eq(contactRelationships.toContactId, testContactId1),
        eq(contactRelationships.fromContactId, testContactId2),
        eq(contactRelationships.toContactId, testContactId2)
      )
    );

    // Clean up test contacts
    await db.delete(contacts).where(eq(contacts.id, testContactId1));
    await db.delete(contacts).where(eq(contacts.id, testContactId2));
  }, 30000); // 30s timeout for cleanup

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
  }, 15000);

  it('should retrieve relationships for a contact', async () => {
    const relationships = await getRelationshipsForContact(testContactId1);

    expect(relationships).toBeDefined();
    expect(relationships.length).toBeGreaterThan(0);

    const relationship = relationships[0];
    expect(relationship.relationshipType).toBe('works_with');
    expect(relationship.relatedContact).toBeDefined();
    // Use partial match since name includes timestamp
    expect(relationship.relatedContact.name).toContain('Test Contact 2');
  }, 15000);

  it('should delete a relationship', async () => {
    const result = await deleteRelationship(testRelationshipId);
    expect(result.success).toBe(true);

    // Verify the specific relationship was deleted
    const relationships = await getRelationshipsForContact(testContactId1);
    const deletedRelationship = relationships.find(r => r.id === testRelationshipId);
    expect(deletedRelationship).toBeUndefined();
  }, 15000);

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
  }, 15000);
});
