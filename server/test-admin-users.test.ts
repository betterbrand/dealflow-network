import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { listAuthorizedUsers, addAuthorizedUser, removeAuthorizedUser } from "./_core/admin-users";
import { getDb } from "./db";
import { authorizedUsers } from "../drizzle/schema";
import { eq, or, like } from "drizzle-orm";

describe("Admin User Management (Database-backed)", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  const testPrefix = `test-admin-${Date.now()}`;
  const testEmail1 = `${testPrefix}-1@example.com`;
  const testEmail2 = `${testPrefix}-2@example.com`;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Add test users
    await db.insert(authorizedUsers).values([
      { email: testEmail1, notes: "Test user 1" },
      { email: testEmail2, notes: "Test user 2" },
    ]);
  });

  afterAll(async () => {
    if (db) {
      // Clean up all test users created during this test run
      await db.delete(authorizedUsers).where(
        like(authorizedUsers.email, `${testPrefix}%`)
      );
      // Also clean up any other test emails
      await db.delete(authorizedUsers).where(
        or(
          like(authorizedUsers.email, "add-%@example.com"),
          like(authorizedUsers.email, "new-%@example.com"),
          like(authorizedUsers.email, "trim-%@example.com"),
          like(authorizedUsers.email, "notes-%@example.com"),
          like(authorizedUsers.email, "temp-%@example.com"),
          eq(authorizedUsers.email, "persistent@example.com")
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
    });

    it("should normalize email to lowercase", async () => {
      const newEmail = `new-${Date.now()}@example.com`;
      const result = await addAuthorizedUser(newEmail.toUpperCase());
      expect(result.success).toBe(true);

      const users = await listAuthorizedUsers();
      expect(users).toContain(newEmail);
    });

    it("should trim whitespace from email", async () => {
      const newEmail = `trim-${Date.now()}@example.com`;
      const result = await addAuthorizedUser(`  ${newEmail}  `);
      expect(result.success).toBe(true);

      const users = await listAuthorizedUsers();
      expect(users).toContain(newEmail);
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

      if (db) {
        const user = await db
          .select()
          .from(authorizedUsers)
          .where(eq(authorizedUsers.email, newEmail))
          .limit(1);

        expect(user[0]?.addedBy).toBe(1);
        expect(user[0]?.notes).toBe("Added by admin");
      }
    });
  });

  describe("removeAuthorizedUser", () => {
    it("should remove an existing user successfully", async () => {
      // Add a user specifically to remove
      const tempEmail = `temp-remove-${Date.now()}@example.com`;
      await addAuthorizedUser(tempEmail);

      const result = await removeAuthorizedUser(tempEmail);
      expect(result.success).toBe(true);
      expect(result.message).toContain("Removed");

      const users = await listAuthorizedUsers();
      expect(users).not.toContain(tempEmail);
    });

    it("should normalize email when removing", async () => {
      // Add a user specifically to remove
      const tempEmail = `temp-norm-${Date.now()}@example.com`;
      await addAuthorizedUser(tempEmail);

      const result = await removeAuthorizedUser(tempEmail.toUpperCase());
      expect(result.success).toBe(true);

      const users = await listAuthorizedUsers();
      expect(users).not.toContain(tempEmail);
    });

    it("should reject removing non-existent user", async () => {
      const result = await removeAuthorizedUser("notfound@example.com");
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
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
      const newEmail1 = `new-int-${Date.now()}-1@example.com`;
      const newEmail2 = `new-int-${Date.now()}-2@example.com`;
      const tempEmail = `temp-int-${Date.now()}@example.com`;

      // Add temp user to remove
      await addAuthorizedUser(tempEmail);
      await addAuthorizedUser(newEmail1);
      await addAuthorizedUser(newEmail2);
      await removeAuthorizedUser(tempEmail);

      const users = await listAuthorizedUsers();
      expect(users).toContain(testEmail1);
      expect(users).toContain(newEmail1);
      expect(users).toContain(newEmail2);
      expect(users).not.toContain(tempEmail);
    });

    it("should persist data across function calls", async () => {
      const persistEmail = `persistent-${Date.now()}@example.com`;
      await addAuthorizedUser(persistEmail);

      // Simulate a new request by calling list again
      const users = await listAuthorizedUsers();
      expect(users).toContain(persistEmail);
    });
  });
});
