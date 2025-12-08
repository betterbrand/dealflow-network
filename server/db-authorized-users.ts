import { eq } from "drizzle-orm";
import { authorizedUsers, InsertAuthorizedUser } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Database functions for managing authorized users whitelist
 * Provides persistent storage for magic link authentication
 */

/**
 * Get all authorized user emails
 */
export async function getAllAuthorizedUsers() {
  const db = await getDb();
  if (!db) {
    console.warn("[AuthorizedUsers] Database not available");
    return [];
  }

  try {
    const users = await db.select().from(authorizedUsers).orderBy(authorizedUsers.email);
    return users;
  } catch (error) {
    console.error("[AuthorizedUsers] Failed to fetch authorized users:", error);
    return [];
  }
}

/**
 * Check if an email is authorized
 */
export async function isEmailAuthorized(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[AuthorizedUsers] Database not available");
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await db
      .select()
      .from(authorizedUsers)
      .where(eq(authorizedUsers.email, normalizedEmail))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("[AuthorizedUsers] Failed to check authorization:", error);
    return false;
  }
}

/**
 * Add a new authorized user
 */
export async function addAuthorizedUser(
  email: string,
  addedBy?: number,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database not available" };
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail) {
    return { success: false, message: "Email address is required" };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, message: "Invalid email format" };
  }

  // Check if already exists
  const exists = await isEmailAuthorized(normalizedEmail);
  if (exists) {
    return { success: false, message: "User already authorized" };
  }

  try {
    const newUser: InsertAuthorizedUser = {
      email: normalizedEmail,
      addedBy,
      notes,
    };

    await db.insert(authorizedUsers).values(newUser);
    return { success: true, message: `Added ${normalizedEmail} to authorized users` };
  } catch (error) {
    console.error("[AuthorizedUsers] Failed to add user:", error);
    return { success: false, message: "Failed to add user to database" };
  }
}

/**
 * Remove an authorized user
 */
export async function removeAuthorizedUser(
  email: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database not available" };
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail) {
    return { success: false, message: "Email address is required" };
  }

  // Check if user exists
  const exists = await isEmailAuthorized(normalizedEmail);
  if (!exists) {
    return { success: false, message: "User not found in authorized list" };
  }

  // Prevent removing the last admin user
  const allUsers = await getAllAuthorizedUsers();
  if (allUsers.length === 1) {
    return { success: false, message: "Cannot remove the last authorized user" };
  }

  try {
    await db.delete(authorizedUsers).where(eq(authorizedUsers.email, normalizedEmail));
    return { success: true, message: `Removed ${normalizedEmail} from authorized users` };
  } catch (error) {
    console.error("[AuthorizedUsers] Failed to remove user:", error);
    return { success: false, message: "Failed to remove user from database" };
  }
}

/**
 * Initialize database with default authorized users if empty
 */
export async function initializeAuthorizedUsers(defaultEmails: string[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[AuthorizedUsers] Database not available, skipping initialization");
    return;
  }

  try {
    const existingUsers = await getAllAuthorizedUsers();
    
    if (existingUsers.length === 0) {
      console.log("[AuthorizedUsers] Initializing with default users...");
      
      for (const email of defaultEmails) {
        const normalizedEmail = email.toLowerCase().trim();
        await db.insert(authorizedUsers).values({
          email: normalizedEmail,
          notes: "Initial authorized user",
        });
      }
      
      console.log(`[AuthorizedUsers] Initialized ${defaultEmails.length} authorized users`);
    }
  } catch (error) {
    console.error("[AuthorizedUsers] Failed to initialize:", error);
  }
}
