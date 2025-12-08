import {
  getAllAuthorizedUsers,
  addAuthorizedUser as dbAddAuthorizedUser,
  removeAuthorizedUser as dbRemoveAuthorizedUser,
} from "../db-authorized-users";

/**
 * Admin user management functions
 * Now uses database for persistent storage
 */

export async function listAuthorizedUsers(): Promise<string[]> {
  const users = await getAllAuthorizedUsers();
  return users.map((u) => u.email).sort();
}

export async function addAuthorizedUser(
  email: string,
  addedBy?: number,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  return await dbAddAuthorizedUser(email, addedBy, notes);
}

export async function removeAuthorizedUser(
  email: string
): Promise<{ success: boolean; message: string }> {
  return await dbRemoveAuthorizedUser(email);
}
