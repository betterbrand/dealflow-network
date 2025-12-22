import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateMagicLinkToken,
  verifyMagicLinkToken,
  generateSessionToken,
  verifySessionToken,
  isAuthorizedUser,
} from "./_core/magic-link";
import { getDb } from "./db";
import { authorizedUsers } from "../drizzle/schema";

describe("Magic Link Authentication (Database-backed)", () => {
  let testEmail: string;

  // Set up test users in database
  beforeEach(async () => {
    testEmail = `test-${Date.now()}@example.com`;
    const db = await getDb();
    if (db) {
      await db.insert(authorizedUsers).values([
        { email: testEmail, notes: "Test user" },
      ]);
    }
    // Small delay to ensure database operations complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    const db = await getDb();
    if (db) {
      const { eq } = await import("drizzle-orm");
      await db.delete(authorizedUsers).where(eq(authorizedUsers.email, testEmail));
    }
  });

  describe("isAuthorizedUser", () => {
    it("should return true for authorized users", async () => {
      expect(await isAuthorizedUser(testEmail)).toBe(true);
    });

    it("should return false for unauthorized users", async () => {
      expect(await isAuthorizedUser("unauthorized@example.com")).toBe(false);
      expect(await isAuthorizedUser("hacker@evil.com")).toBe(false);
    });

    it("should be case-insensitive", async () => {
      expect(await isAuthorizedUser(testEmail.toUpperCase())).toBe(true);
    });

    it("should handle whitespace", async () => {
      expect(await isAuthorizedUser(`  ${testEmail}  `)).toBe(true);
    });
  });

  describe("Magic Link Tokens", () => {
    it("should generate and verify valid magic link tokens", async () => {
      const token = await generateMagicLinkToken(testEmail);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      const verifiedEmail = await verifyMagicLinkToken(token);
      expect(verifiedEmail).toBe(testEmail);
    });

    it("should normalize email in token", async () => {
      const token = await generateMagicLinkToken(`  ${testEmail.toUpperCase()}  `);
      const verifiedEmail = await verifyMagicLinkToken(token);
      expect(verifiedEmail).toBe(testEmail);
    });

    it("should reject invalid tokens", async () => {
      expect(await verifyMagicLinkToken("invalid-token")).toBeNull();
      expect(await verifyMagicLinkToken("")).toBeNull();
    });

    it("should reject tokens with wrong type", async () => {
      // Generate a session token and try to verify as magic link
      const sessionToken = generateSessionToken(testEmail);
      const result = await verifyMagicLinkToken(sessionToken);
      expect(result).toBeNull();
    });

    it("should reject tokens for unauthorized users", async () => {
      // Temporarily add a user, generate token, then remove them
      const db = await getDb();
      if (db) {
        const tempEmail = `temp-${Date.now()}@example.com`;
        const { eq } = await import("drizzle-orm");
        // Cleanup first in case of previous failed run
        await db.delete(authorizedUsers).where(eq(authorizedUsers.email, tempEmail)).catch(() => {});

        await db.insert(authorizedUsers).values({ email: tempEmail });
        const token = await generateMagicLinkToken(tempEmail);

        // Remove user from database
        await db.delete(authorizedUsers).where(eq(authorizedUsers.email, tempEmail));

        // Token should now be invalid
        const result = await verifyMagicLinkToken(token);
        expect(result).toBeNull();
      }
    });

    it("should throw error when generating token for unauthorized user", async () => {
      await expect(generateMagicLinkToken("unauthorized@example.com")).rejects.toThrow(
        "Unauthorized email address"
      );
    });
  });

  describe("Session Tokens", () => {
    it("should generate and verify valid session tokens", async () => {
      const token = generateSessionToken(testEmail);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      const verifiedEmail = await verifySessionToken(token);
      expect(verifiedEmail).toBe(testEmail);
    });

    it("should normalize email in session token", async () => {
      const token = generateSessionToken(`  ${testEmail.toUpperCase()}  `);
      const verifiedEmail = await verifySessionToken(token);
      expect(verifiedEmail).toBe(testEmail);
    });

    it("should reject invalid session tokens", async () => {
      expect(await verifySessionToken("invalid-token")).toBeNull();
      expect(await verifySessionToken("")).toBeNull();
    });

    it("should reject session tokens with wrong type", async () => {
      // Generate a magic link token and try to verify as session
      const magicToken = await generateMagicLinkToken(testEmail);
      const result = await verifySessionToken(magicToken);
      expect(result).toBeNull();
    });

    it("should reject session tokens for unauthorized users", async () => {
      // Temporarily add a user, generate token, then remove them
      const db = await getDb();
      if (db) {
        const tempEmail = `temp-session-${Date.now()}@example.com`;
        const { eq } = await import("drizzle-orm");
        // Cleanup first in case of previous failed run
        await db.delete(authorizedUsers).where(eq(authorizedUsers.email, tempEmail)).catch(() => {});

        await db.insert(authorizedUsers).values({ email: tempEmail });
        const token = generateSessionToken(tempEmail);

        // Remove user from database
        await db.delete(authorizedUsers).where(eq(authorizedUsers.email, tempEmail));

        // Token should now be invalid
        const result = await verifySessionToken(token);
        expect(result).toBeNull();
      }
    });
  });
});
