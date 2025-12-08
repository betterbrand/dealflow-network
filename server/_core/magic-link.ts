import jwt from "jsonwebtoken";
import { ENV } from "./env";
import { isEmailAuthorized, initializeAuthorizedUsers } from "../db-authorized-users";

/**
 * Default authorized users for initial setup
 * These will be added to the database on first run if the database is empty
 */
const DEFAULT_AUTHORIZED_USERS = [
  "scott@betterbrand.com",
  "brian@discoveryblock.com",
  "djohnstonec@gmail.com",
  "christopher@alta3x.com",
  "test@example.com", // For testing
];

// Initialize database with default users on startup
initializeAuthorizedUsers(DEFAULT_AUTHORIZED_USERS).catch((error) => {
  console.error("[MagicLink] Failed to initialize authorized users:", error);
});

/**
 * Check if an email is authorized to access the system
 * Now checks the database instead of in-memory array
 */
export async function isAuthorizedUser(email: string): Promise<boolean> {
  return await isEmailAuthorized(email.toLowerCase().trim());
}

/**
 * Generate a magic link token for email-based authentication
 * Token expires in 15 minutes
 */
export async function generateMagicLinkToken(email: string): Promise<string> {
  const isAuthorized = await isAuthorizedUser(email);
  if (!isAuthorized) {
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
export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, ENV.cookieSecret) as {
      email: string;
      type: string;
    };

    if (decoded.type !== "magic-link") {
      return null;
    }

    const isAuthorized = await isAuthorizedUser(decoded.email);
    if (!isAuthorized) {
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
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, ENV.cookieSecret) as {
      email: string;
      type: string;
    };

    if (decoded.type !== "session") {
      return null;
    }

    const isAuthorized = await isAuthorizedUser(decoded.email);
    if (!isAuthorized) {
      return null;
    }

    return decoded.email;
  } catch (error) {
    return null;
  }
}
