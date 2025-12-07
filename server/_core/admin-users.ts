import { AUTHORIZED_USERS } from "./magic-link";

/**
 * Admin user management functions
 * Note: These modify the in-memory whitelist. Changes are lost on server restart.
 * For production, consider storing in database or environment variables.
 */

export function listAuthorizedUsers(): string[] {
  return [...AUTHORIZED_USERS].sort();
}

export function addAuthorizedUser(email: string): { success: boolean; message: string } {
  const normalizedEmail = email.toLowerCase().trim();
  
  if (!normalizedEmail) {
    return { success: false, message: "Email address is required" };
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, message: "Invalid email format" };
  }
  
  if (AUTHORIZED_USERS.includes(normalizedEmail)) {
    return { success: false, message: "User already authorized" };
  }
  
  AUTHORIZED_USERS.push(normalizedEmail);
  return { success: true, message: `Added ${normalizedEmail} to authorized users` };
}

export function removeAuthorizedUser(email: string): { success: boolean; message: string } {
  const normalizedEmail = email.toLowerCase().trim();
  
  if (!normalizedEmail) {
    return { success: false, message: "Email address is required" };
  }
  
  const index = AUTHORIZED_USERS.indexOf(normalizedEmail);
  if (index === -1) {
    return { success: false, message: "User not found in authorized list" };
  }
  
  // Prevent removing the last admin user
  if (AUTHORIZED_USERS.length === 1) {
    return { success: false, message: "Cannot remove the last authorized user" };
  }
  
  AUTHORIZED_USERS.splice(index, 1);
  return { success: true, message: `Removed ${normalizedEmail} from authorized users` };
}
