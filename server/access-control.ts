import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { contacts, contactAccessRequests } from "../drizzle/schema";

/**
 * Access control layer for contact visibility and permissions
 * Implements hybrid contact model: private vs shared contacts
 */

// Single contact permission check
export async function canViewContact(userId: number, contactId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get the contact
  const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact.length) return false;

  // If contact is not private (shared), anyone can view
  if (!contact[0].isPrivate) return true;

  // If user is the owner
  if (contact[0].createdBy === userId) return true;

  // Check if user has approved access request
  const approvedRequest = await db
    .select()
    .from(contactAccessRequests)
    .where(
      and(
        eq(contactAccessRequests.contactId, contactId),
        eq(contactAccessRequests.requesterId, userId),
        eq(contactAccessRequests.status, "approved")
      )
    )
    .limit(1);

  return approvedRequest.length > 0;
}

// Batch permission check to prevent N+1 queries
export async function batchCanViewContacts(
  userId: number,
  contactIds: number[]
): Promise<Map<number, boolean>> {
  const db = await getDb();
  if (!db) return new Map();

  if (contactIds.length === 0) return new Map();

  // Single query: get all contacts
  const contactsData = await db
    .select()
    .from(contacts)
    .where(inArray(contacts.id, contactIds));

  // Separate private from public
  const privateContactIds = contactsData
    .filter(c => c.isPrivate && c.createdBy !== userId)
    .map(c => c.id);

  if (privateContactIds.length === 0) {
    // All public or owned - grant access to all
    return new Map(contactIds.map(id => {
      const contact = contactsData.find(c => c.id === id);
      if (!contact) return [id, false];
      return [id, !contact.isPrivate || contact.createdBy === userId];
    }));
  }

  // Single query: check all access requests
  const approvedRequests = await db
    .select()
    .from(contactAccessRequests)
    .where(
      and(
        eq(contactAccessRequests.requesterId, userId),
        eq(contactAccessRequests.status, "approved"),
        inArray(contactAccessRequests.contactId, privateContactIds)
      )
    );

  const approvedSet = new Set(approvedRequests.map(r => r.contactId));

  // Build result map
  return new Map(
    contactIds.map(id => {
      const contact = contactsData.find(c => c.id === id);
      if (!contact) return [id, false];
      if (!contact.isPrivate) return [id, true];
      if (contact.createdBy === userId) return [id, true];
      return [id, approvedSet.has(id)];
    })
  );
}

export async function canEditContact(userId: number, contactId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Only owner can edit shared contact data
  const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact.length) return false;

  return contact[0].createdBy === userId;
}

export async function canDeleteContact(userId: number, contactId: number): Promise<boolean> {
  // Only owner can delete
  return canEditContact(userId, contactId);
}

export async function getContactAccessStatus(
  userId: number,
  contactId: number
): Promise<"owner" | "approved" | "pending" | "denied" | "none"> {
  const db = await getDb();
  if (!db) return "none";

  const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact.length) return "none";

  // Check ownership
  if (contact[0].createdBy === userId) return "owner";

  // If not private, everyone has access
  if (!contact[0].isPrivate) return "approved";

  // Check for access request
  const request = await db
    .select()
    .from(contactAccessRequests)
    .where(
      and(
        eq(contactAccessRequests.contactId, contactId),
        eq(contactAccessRequests.requesterId, userId)
      )
    )
    .limit(1);

  if (!request.length) return "none";

  return request[0].status as "approved" | "pending" | "denied";
}

// Batch access status check
export async function batchGetContactAccessStatus(
  userId: number,
  contactIds: number[]
): Promise<Map<number, "owner" | "approved" | "pending" | "denied" | "none">> {
  const db = await getDb();
  if (!db) return new Map();

  if (contactIds.length === 0) return new Map();

  // Get all contacts in one query
  const contactsData = await db
    .select()
    .from(contacts)
    .where(inArray(contacts.id, contactIds));

  // Get all access requests in one query
  const requests = await db
    .select()
    .from(contactAccessRequests)
    .where(
      and(
        eq(contactAccessRequests.requesterId, userId),
        inArray(contactAccessRequests.contactId, contactIds)
      )
    );

  const requestMap = new Map(requests.map(r => [r.contactId, r.status]));

  return new Map(
    contactIds.map(id => {
      const contact = contactsData.find(c => c.id === id);
      if (!contact) return [id, "none"];
      if (contact.createdBy === userId) return [id, "owner"];
      if (!contact.isPrivate) return [id, "approved"];

      const requestStatus = requestMap.get(id);
      if (!requestStatus) return [id, "none"];
      return [id, requestStatus as "approved" | "pending" | "denied"];
    })
  );
}
