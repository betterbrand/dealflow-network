import { describe, it, expect } from "vitest";
import {
  generateMagicLinkToken,
  verifyMagicLinkToken,
  generateSessionToken,
  verifySessionToken,
  isAuthorizedUser,
} from "./_core/magic-link";

describe("Magic Link Authentication", () => {
  describe("isAuthorizedUser", () => {
    it("should return true for authorized users", () => {
      expect(isAuthorizedUser("scott@betterbrand.com")).toBe(true);
      expect(isAuthorizedUser("test@example.com")).toBe(true);
    });

    it("should return false for unauthorized users", () => {
      expect(isAuthorizedUser("unauthorized@example.com")).toBe(false);
      expect(isAuthorizedUser("hacker@evil.com")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(isAuthorizedUser("SCOTT@BETTERBRAND.COM")).toBe(true);
      expect(isAuthorizedUser("Scott@BetterBrand.com")).toBe(true);
    });

    it("should handle whitespace", () => {
      expect(isAuthorizedUser("  scott@betterbrand.com  ")).toBe(true);
    });
  });

  describe("Magic Link Tokens", () => {
    it("should generate and verify valid magic link tokens", () => {
      const email = "test@example.com";
      const token = generateMagicLinkToken(email);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      const verifiedEmail = verifyMagicLinkToken(token);
      expect(verifiedEmail).toBe(email);
    });

    it("should normalize email in token", () => {
      const token = generateMagicLinkToken("  TEST@EXAMPLE.COM  ");
      const verifiedEmail = verifyMagicLinkToken(token);
      expect(verifiedEmail).toBe("test@example.com");
    });

    it("should reject invalid tokens", () => {
      expect(verifyMagicLinkToken("invalid-token")).toBeNull();
      expect(verifyMagicLinkToken("")).toBeNull();
    });

    it("should reject tokens with wrong type", () => {
      // Generate a session token and try to verify as magic link
      const sessionToken = generateSessionToken("test@example.com");
      const result = verifyMagicLinkToken(sessionToken);
      expect(result).toBeNull();
    });
  });

  describe("Session Tokens", () => {
    it("should generate and verify valid session tokens", () => {
      const email = "test@example.com";
      const token = generateSessionToken(email);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      const verifiedEmail = verifySessionToken(token);
      expect(verifiedEmail).toBe(email);
    });

    it("should normalize email in session token", () => {
      const token = generateSessionToken("  TEST@EXAMPLE.COM  ");
      const verifiedEmail = verifySessionToken(token);
      expect(verifiedEmail).toBe("test@example.com");
    });

    it("should reject invalid session tokens", () => {
      expect(verifySessionToken("invalid-token")).toBeNull();
      expect(verifySessionToken("")).toBeNull();
    });

    it("should reject tokens with wrong type", () => {
      // Generate a magic link token and try to verify as session
      const magicToken = generateMagicLinkToken("test@example.com");
      const result = verifySessionToken(magicToken);
      expect(result).toBeNull();
    });
  });

  describe("Token Expiration", () => {
    it("should generate tokens that don't immediately expire", () => {
      const email = "test@example.com";
      
      const magicToken = generateMagicLinkToken(email);
      expect(verifyMagicLinkToken(magicToken)).toBe(email);

      const sessionToken = generateSessionToken(email);
      expect(verifySessionToken(sessionToken)).toBe(email);
    });
  });
});
