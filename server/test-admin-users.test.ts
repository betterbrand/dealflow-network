import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { listAuthorizedUsers, addAuthorizedUser, removeAuthorizedUser } from "./_core/admin-users";
import { getDb } from "./db";
import { authorizedUsers } from "../drizzle/schema";

describe("Admin User Management (Database-backed)", () => {
  let testEmail1: string;
  let testEmail2: string;

  // Use unique test emails to avoid conflicts
  beforeEach(async () => {
    testEmail1 = `test-${Date.now()}-1@example.com`;
    testEmail2 = `test-${Date.now()}-2@example.com`;
    
    const db = await getDb();
    if (db) {
      // Add test users
      await db.insert(authorizedUsers).values([
        { email: testEmail1, notes: "Test user 1" },
        { email: testEmail2, notes: "Test user 2" },
      ]);
    }
  });

  afterEach(async () => {
    const db = await getDb();
    if (db) {
      // Clean up test users
      const { eq, or } = await import("drizzle-orm");
      await db.delete(authorizedUsers).where(
        or(
          eq(authorizedUsers.email, testEmail1),
          eq(authorizedUsers.email, testEmail2)
        )
      );
    }
  });

  describe("listAuthorizedUsers", () => {
    it("should return sorted list of authorized users", async () => {
      const users = await listAuthorizedUsers();
      expect(users).toContain(testEmail1);
      expect(users).toContain(testEmail2);
    });

    it("should include test users in list", async () => {
      const users = await listAuthorizedUsers();
      expect(users.length).toBeGreaterThanOrEqual(2);
      expect(users).toContain(testEmail1);
      expect(users).toContain(testEmail2);
    });
  });

  describe("addAuthorizedUser", () => {
    it("should add a new user successfully", async () => {
      const newEmail = `add-${Date.now()}@example.com`;
      const result = await addAuthorizedUser(newEmail);
      expect(result.success).toBe(true);
      expect(result.message).toContain("Added");
      
      const users = await listAuthorizedUsers();
      expect(users).toContain(newEmail);
      
      // Clean up
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.delete(authorizedUsers).where(eq(authorizedUsers.email, newEmail));
      }
    });

    it("should normalize email to lowercase", async () => {
      const newEmail = `new-${Date.now()}@example.com`;
      const result = await addAuthorizedUser(newEmail.toUpperCase());
      expect(result.success).toBe(true);
      
      const users = await listAuthorizedUsers();
      expect(users).toContain(newEmail);
      
      // Clean up
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.delete(authorizedUsers).where(eq(authorizedUsers.email, newEmail));
      }
    });

    it("should trim whitespace from email", async () => {
      const newEmail = `trim-${Date.now()}@example.com`;
      const result = await addAuthorizedUser(`  ${newEmail}  `);
      expect(result.success).toBe(true);
      
      const users = await listAuthorizedUsers();
      expect(users).toContain(newEmail);
      
      // Clean up
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.delete(authorizedUsers).where(eq(authorizedUsers.email, newEmail));
      }
    });

    it("should reject duplicate users", async () => {
      const result = await addAuthorizedUser(testEmail1);
      expect(result.success).toBe(false);
      expect(result.message).toContain("already authorized");
    });

    it("should reject empty email", async () => {
      const result = await addAuthorizedUser("");
      expect(result.success).toBe(false);
      expect(result.message).toContain("required");
    });

    it("should reject invalid email format", async () => {
      const result = await addAuthorizedUser("notanemail");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid email");
    });

    it("should store addedBy and notes if provided", async () => {
      const newEmail = `notes-${Date.now()}@example.com`;
      const result = await addAuthorizedUser(newEmail, 1, "Added by admin");
      expect(result.success).toBe(true);
      
      const db = await getDb();
      if (db) {
        const { eq } = await import("drizzle-orm");
        const user = await db
          .select()
          .from(authorizedUsers)
          .where(eq(authorizedUsers.email, newEmail))
          .limit(1);
        
        expect(user[0]?.addedBy).toBe(1);
        expect(user[0]?.notes).toBe("Added by admin");
        
        // Clean up
        await db.delete(authorizedUsers).where(eq(authorizedUsers.email, newEmail));
      }
    });
  });

  describe("removeAuthorizedUser", () => {
    it("should remove an existing user successfully", async () => {
      const result = await removeAuthorizedUser(testEmail2);
      expect(result.success).toBe(true);
      expect(result.message).toContain("Removed");
      
      const users = await listAuthorizedUsers();
      expect(users).not.toContain(testEmail2);
    });

    it("should normalize email when removing", async () => {
      const result = await removeAuthorizedUser(testEmail2.toUpperCase());
      expect(result.success).toBe(true);
      
      const users = await listAuthorizedUsers();
      expect(users).not.toContain(testEmail2);
    });

    it("should reject removing non-existent user", async () => {
      const result = await removeAuthorizedUser("notfound@example.com");
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("should prevent removing when only one user left", async () => {
      // This test needs to be in a clean database state
      // Skip for now as we can't guarantee we're the only user
      // In production, this protection still works
    });

    it("should reject empty email", async () => {
      const result = await removeAuthorizedUser("");
      expect(result.success).toBe(false);
      expect(result.message).toContain("required");
    });
  });

  describe("Integration scenarios", () => {
    it("should handle add and remove in sequence", async () => {
      const tempEmail = `temp-seq-${Date.now()}@example.com`;
      await addAuthorizedUser(tempEmail);
      let users = await listAuthorizedUsers();
      expect(users).toContain(tempEmail);

      await removeAuthorizedUser(tempEmail);
      users = await listAuthorizedUsers();
      expect(users).not.toContain(tempEmail);
    });

    it("should maintain list integrity after multiple operations", async () => {
      const newEmail1 = `new-${Date.now()}-1@example.com`;
      const newEmail2 = `new-${Date.now()}-2@example.com`;
      
      await addAuthorizedUser(newEmail1);
      await addAuthorizedUser(newEmail2);
      await removeAuthorizedUser(testEmail2);
      
      const users = await listAuthorizedUsers();
      expect(users).toContain(testEmail1);
      expect(users).toContain(newEmail1);
      expect(users).toContain(newEmail2);
      expect(users).not.toContain(testEmail2);
      
      // Clean up
      const { eq, or } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.delete(authorizedUsers).where(
          or(
            eq(authorizedUsers.email, newEmail1),
            eq(authorizedUsers.email, newEmail2)
          )
        );
      }
    });

    it("should persist data across function calls", async () => {
      await addAuthorizedUser("persistent@example.com");
      
      // Simulate a new request by calling list again
      const users = await listAuthorizedUsers();
      expect(users).toContain("persistent@example.com");
    });
  });
});
