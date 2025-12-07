import { describe, it, expect, beforeEach } from "vitest";
import { listAuthorizedUsers, addAuthorizedUser, removeAuthorizedUser } from "./_core/admin-users";
import { AUTHORIZED_USERS } from "./_core/magic-link";

describe("Admin User Management", () => {
  let initialUsers: string[];

  beforeEach(() => {
    // Save initial state
    initialUsers = [...AUTHORIZED_USERS];
    // Reset to known state
    AUTHORIZED_USERS.length = 0;
    AUTHORIZED_USERS.push("admin@example.com", "user@example.com");
  });

  describe("listAuthorizedUsers", () => {
    it("should return sorted list of authorized users", () => {
      const users = listAuthorizedUsers();
      expect(users).toEqual(["admin@example.com", "user@example.com"]);
    });

    it("should return a copy, not the original array", () => {
      const users = listAuthorizedUsers();
      users.push("test@example.com");
      expect(AUTHORIZED_USERS).not.toContain("test@example.com");
    });
  });

  describe("addAuthorizedUser", () => {
    it("should add a new user successfully", () => {
      const result = addAuthorizedUser("newuser@example.com");
      expect(result.success).toBe(true);
      expect(result.message).toContain("Added");
      expect(AUTHORIZED_USERS).toContain("newuser@example.com");
    });

    it("should normalize email to lowercase", () => {
      const result = addAuthorizedUser("NewUser@Example.COM");
      expect(result.success).toBe(true);
      expect(AUTHORIZED_USERS).toContain("newuser@example.com");
    });

    it("should trim whitespace from email", () => {
      const result = addAuthorizedUser("  test@example.com  ");
      expect(result.success).toBe(true);
      expect(AUTHORIZED_USERS).toContain("test@example.com");
    });

    it("should reject duplicate users", () => {
      const result = addAuthorizedUser("admin@example.com");
      expect(result.success).toBe(false);
      expect(result.message).toContain("already authorized");
    });

    it("should reject empty email", () => {
      const result = addAuthorizedUser("");
      expect(result.success).toBe(false);
      expect(result.message).toContain("required");
    });

    it("should reject invalid email format", () => {
      const result = addAuthorizedUser("notanemail");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid email");
    });
  });

  describe("removeAuthorizedUser", () => {
    it("should remove an existing user successfully", () => {
      const result = removeAuthorizedUser("user@example.com");
      expect(result.success).toBe(true);
      expect(result.message).toContain("Removed");
      expect(AUTHORIZED_USERS).not.toContain("user@example.com");
    });

    it("should normalize email when removing", () => {
      const result = removeAuthorizedUser("USER@EXAMPLE.COM");
      expect(result.success).toBe(true);
      expect(AUTHORIZED_USERS).not.toContain("user@example.com");
    });

    it("should reject removing non-existent user", () => {
      const result = removeAuthorizedUser("notfound@example.com");
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("should reject removing the last user", () => {
      // Remove all but one
      removeAuthorizedUser("user@example.com");
      const result = removeAuthorizedUser("admin@example.com");
      expect(result.success).toBe(false);
      expect(result.message).toContain("last authorized user");
      expect(AUTHORIZED_USERS).toContain("admin@example.com");
    });

    it("should reject empty email", () => {
      const result = removeAuthorizedUser("");
      expect(result.success).toBe(false);
      expect(result.message).toContain("required");
    });
  });

  describe("Integration scenarios", () => {
    it("should handle add and remove in sequence", () => {
      addAuthorizedUser("temp@example.com");
      expect(AUTHORIZED_USERS).toContain("temp@example.com");
      
      removeAuthorizedUser("temp@example.com");
      expect(AUTHORIZED_USERS).not.toContain("temp@example.com");
    });

    it("should maintain list integrity after multiple operations", () => {
      addAuthorizedUser("user1@example.com");
      addAuthorizedUser("user2@example.com");
      removeAuthorizedUser("user@example.com");
      
      const users = listAuthorizedUsers();
      expect(users).toContain("admin@example.com");
      expect(users).toContain("user1@example.com");
      expect(users).toContain("user2@example.com");
      expect(users).not.toContain("user@example.com");
    });
  });
});
