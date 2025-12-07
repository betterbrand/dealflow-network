import jwt from "jsonwebtoken";
import { ENV } from "./env";

/**
 * Hardcoded whitelist of authorized users for MVP
 * Add or remove emails here to control access
 */
export const AUTHORIZED_USERS = [
  "scott@betterbrand.com",
  "test@example.com", // For testing
  // Add more authorized emails here
];

/**
 * Check if an email is authorized to access the system
 */
export function isAuthorizedUser(email: string): boolean {
  return AUTHORIZED_USERS.includes(email.toLowerCase().trim());
}

/**
 * Generate a magic link token for email-based authentication
 * Token expires in 15 minutes
 */
export function generateMagicLinkToken(email: string): string {
  if (!isAuthorizedUser(email)) {
    throw new Error("Unauthorized email address");
  }

  return jwt.sign(
    {
      email: email.toLowerCase().trim(),
      type: "magic-link",
    },
    ENV.cookieSecret,
    {
      expiresIn: "15m", // Token valid for 15 minutes
    }
  );
}

/**
 * Verify a magic link token and return the email if valid
 */
export function verifyMagicLinkToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, ENV.cookieSecret) as {
      email: string;
      type: string;
    };

    if (decoded.type !== "magic-link") {
      return null;
    }

    if (!isAuthorizedUser(decoded.email)) {
      return null;
    }

    return decoded.email;
  } catch (error) {
    // Token expired or invalid
    return null;
  }
}

/**
 * Generate a session token after successful magic link verification
 * Session lasts 30 days
 */
export function generateSessionToken(email: string): string {
  return jwt.sign(
    {
      email: email.toLowerCase().trim(),
      type: "session",
    },
    ENV.cookieSecret,
    {
      expiresIn: "30d",
    }
  );
}

/**
 * Verify a session token and return the email if valid
 */
export function verifySessionToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, ENV.cookieSecret) as {
      email: string;
      type: string;
    };

    if (decoded.type !== "session") {
      return null;
    }

    if (!isAuthorizedUser(decoded.email)) {
      return null;
    }

    return decoded.email;
  } catch (error) {
    return null;
  }
}
