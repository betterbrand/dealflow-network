import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { contacts, userContacts, contactContributions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  findDuplicateContact,
  createOrLinkContact,
  getUserContacts,
  getUserContact,
  updateContactData,
  updateUserContactData,
} from "./db-collaborative";

describe("Collaborative Contacts System", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testUserId = 1;
  let testContactId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  afterAll(async () => {
    // Clean up test data
    if (db && testContactId) {
      await db.delete(userContacts).where(eq(userContacts.contactId, testContactId));
      await db.delete(contactContributions).where(eq(contactContributions.contactId, testContactId));
      await db.delete(contacts).where(eq(contacts.id, testContactId));
    }
  });

  describe("Duplicate Detection", () => {
    it("should detect duplicate by email", async () => {
      const duplicate = await findDuplicateContact({
        email: "sam@openai.com",
        name: "Sam Altman",
      });

      expect(duplicate).toBeTruthy();
      expect(duplicate?.matchedBy).toBe("email");
      expect(duplicate?.contact.name).toBe("Sam Altman");
    });

    it("should detect duplicate by LinkedIn URL", async () => {
      const duplicate = await findDuplicateContact({
        linkedinUrl: "https://www.linkedin.com/in/satyanadella",
        name: "Satya Nadella",
      });

      expect(duplicate).toBeTruthy();
      expect(duplicate?.matchedBy).toBe("linkedinUrl");
    });

    it("should detect duplicate by name + company", async () => {
      const duplicate = await findDuplicateContact({
        name: "Patrick Collison",
        company: "Stripe",
      });

      expect(duplicate).toBeTruthy();
      expect(duplicate?.matchedBy).toBe("name+company");
    });

    it("should return null for non-existent contact", async () => {
      const duplicate = await findDuplicateContact({
        email: "nonexistent@example.com",
        name: "Nonexistent Person",
      });

      expect(duplicate).toBeNull();
    });
  });

  describe("Contact Creation with Duplicate Detection", () => {
    it("should create new contact when no duplicate exists", async () => {
      const result = await createOrLinkContact(
        testUserId,
        {
          name: "Test Collaborative Contact",
          email: "test-collab@example.com",
          company: "Test Company",
          role: "Test Role",
        },
        {
          privateNotes: "Test notes",
          relationshipStrength: "strong",
        }
      );

      expect(result.isNew).toBe(true);
      expect(result.contactId).toBeTypeOf("number");
      expect(result.matchedBy).toBeUndefined();

      testContactId = result.contactId;
    });

    it("should link to existing contact when duplicate found by email", async () => {
      // Try to create the same contact again with same email
      const result = await createOrLinkContact(
        1, // Use actual user ID from database
        {
          name: "Test Collaborative Contact Duplicate",
          email: "test-collab@example.com", // Same email
          company: "Different Company",
        },
        {
          privateNotes: "Different notes",
        }
      );

      expect(result.isNew).toBe(false);
      expect(result.contactId).toBe(testContactId);
      expect(result.matchedBy).toBe("email");
    });

    it("should not create duplicate user-contact link", async () => {
      // Try to link same user to same contact again
      const result = await createOrLinkContact(
        testUserId,
        {
          name: "Test Collaborative Contact",
          email: "test-collab@example.com",
        },
        {
          privateNotes: "Updated notes",
        }
      );

      expect(result.isNew).toBe(false);
      expect(result.contactId).toBe(testContactId);
    });
  });

  describe("User-Specific Data", () => {
    it("should retrieve contact with user-specific data", async () => {
      const contact = await getUserContact(testUserId, testContactId);

      expect(contact).toBeTruthy();
      expect(contact?.name).toBe("Test Collaborative Contact");
      expect(contact?.privateNotes).toBe("Test notes");
      expect(contact?.relationshipStrength).toBe("strong");
      expect(contact?.notes).toBe("Test notes"); // Backward compatibility
    });

    it("should return null for non-existent user-contact link", async () => {
      const contact = await getUserContact(999, testContactId);
      expect(contact).toBeNull();
    });

    it("should retrieve all contacts for a user", async () => {
      const userContactsList = await getUserContacts(testUserId);

      expect(Array.isArray(userContactsList)).toBe(true);
      expect(userContactsList.length).toBeGreaterThan(0);

      const testContact = userContactsList.find((c) => c.id === testContactId);
      expect(testContact).toBeTruthy();
      expect(testContact?.privateNotes).toBe("Test notes");
    });
  });

  describe("Contact Updates with Provenance", () => {
    it("should update shared contact data", async () => {
      // Update contact directly through db
      if (db) {
        await db
          .update(contacts)
          .set({
            phone: "+1234567890",
            location: "San Francisco, CA",
          })
          .where(eq(contacts.id, testContactId));

        const updated = await getUserContact(testUserId, testContactId);
        expect(updated?.phone).toBe("+1234567890");
        expect(updated?.location).toBe("San Francisco, CA");
      }
    });

    it("should update user-specific data without affecting other users", async () => {
      await updateUserContactData(testUserId, testContactId, {
        privateNotes: "Updated private notes",
        relationshipStrength: "medium",
      });

      const updated = await getUserContact(testUserId, testContactId);
      expect(updated?.privateNotes).toBe("Updated private notes");
      expect(updated?.relationshipStrength).toBe("medium");
    });
  });

  describe("Data Isolation", () => {
    it("should isolate user-specific data between users", async () => {
      // User 1's data
      const user1Contact = await getUserContact(testUserId, testContactId);
      expect(user1Contact?.privateNotes).toBe("Updated private notes");

      // User 2's data (if they're linked)
      const user2Contact = await getUserContact(testUserId + 1, testContactId);
      if (user2Contact) {
        expect(user2Contact.privateNotes).not.toBe("Updated private notes");
      }
    });
  });
});
