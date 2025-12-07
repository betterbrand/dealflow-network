/**
 * Database helpers for collaborative contacts system
 * Handles duplicate detection, user-contact relationships, and provenance tracking
 */

import { eq, and, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { contacts, userContacts, contactContributions, users } from "../drizzle/schema";
import type { InsertContact, InsertUserContact, InsertContactContribution } from "../drizzle/schema";

/**
 * Find potential duplicate contacts based on email, LinkedIn URL, or name+company
 */
export async function findDuplicateContact(data: {
  email?: string | null;
  linkedinUrl?: string | null;
  name: string;
  company?: string | null;
}) {
  const db = await getDb();
  if (!db) return null;

  // Priority 1: Match by email (if provided and not null)
  if (data.email) {
    const byEmail = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, data.email))
      .limit(1);
    
    if (byEmail.length > 0) {
      return { contact: byEmail[0], matchedBy: 'email' as const };
    }
  }

  // Priority 2: Match by LinkedIn URL (if provided and not null)
  if (data.linkedinUrl) {
    const byLinkedIn = await db
      .select()
      .from(contacts)
      .where(eq(contacts.linkedinUrl, data.linkedinUrl))
      .limit(1);
    
    if (byLinkedIn.length > 0) {
      return { contact: byLinkedIn[0], matchedBy: 'linkedinUrl' as const };
    }
  }

  // Priority 3: Match by name + company (if both provided)
  if (data.name && data.company) {
    const byNameCompany = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.name, data.name),
          eq(contacts.company, data.company)
        )
      )
      .limit(1);
    
    if (byNameCompany.length > 0) {
      return { contact: byNameCompany[0], matchedBy: 'name+company' as const };
    }
  }

  return null;
}

/**
 * Create or link to existing contact with duplicate detection
 * Returns { contactId, isNew, matchedBy? }
 */
export async function createOrLinkContact(
  userId: number,
  contactData: Omit<Partial<InsertContact>, 'name'> & { name: string },
  userContactData?: Partial<InsertUserContact>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check for duplicates
  const duplicate = await findDuplicateContact({
    email: contactData.email,
    linkedinUrl: contactData.linkedinUrl,
    name: contactData.name!,
    company: contactData.company,
  });

  let contactId: number;
  let isNew = false;
  let matchedBy: string | undefined;

  if (duplicate) {
    // Contact already exists, just link the user to it
    contactId = duplicate.contact.id;
    matchedBy = duplicate.matchedBy;
    
    // Check if user is already linked
    const existingLink = await db
      .select()
      .from(userContacts)
      .where(
        and(
          eq(userContacts.userId, userId),
          eq(userContacts.contactId, contactId)
        )
      )
      .limit(1);
    
    if (existingLink.length === 0) {
      // Create new user-contact link
      await db.insert(userContacts).values({
        userId,
        contactId,
        ...userContactData,
      });
      
      // Log contribution
      await db.insert(contactContributions).values({
        contactId,
        userId,
        fieldName: 'user_link',
        newValue: `User ${userId} added this contact to their network`,
        changeType: 'created',
      });
    }
  } else {
    // Create new contact
    isNew = true;
    
    const [newContact] = await db.insert(contacts).values({
      ...contactData,
      createdBy: userId,
    }).$returningId();
    
    contactId = newContact.id;
    
    // Create user-contact link
    await db.insert(userContacts).values({
      userId,
      contactId,
      ...userContactData,
    });
    
    // Log initial contribution
    await db.insert(contactContributions).values({
      contactId,
      userId,
      fieldName: 'contact',
      newValue: 'Initial contact creation',
      changeType: 'created',
    });
  }

  return { contactId, isNew, matchedBy };
}

/**
 * Get all contacts for a specific user (with their user-specific data)
 */
export async function getUserContacts(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      // Contact fields
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      company: contacts.company,
      role: contacts.role,
      location: contacts.location,
      linkedinUrl: contacts.linkedinUrl,
      twitterUrl: contacts.twitterUrl,
      telegramUsername: contacts.telegramUsername,
      summary: contacts.summary,
      profilePictureUrl: contacts.profilePictureUrl,
      photoUrl: contacts.photoUrl,
      experience: contacts.experience,
      education: contacts.education,
      skills: contacts.skills,
      companyId: contacts.companyId,
      createdBy: contacts.createdBy,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
      
      // User-specific fields
      userContactId: userContacts.id,
      privateNotes: userContacts.privateNotes,
      relationshipStrength: userContacts.relationshipStrength,
      howWeMet: userContacts.howWeMet,
      lastContactedAt: userContacts.lastContactedAt,
      sentiment: userContacts.sentiment,
      interestLevel: userContacts.interestLevel,
      conversationSummary: userContacts.conversationSummary,
      actionItems: userContacts.actionItems,
      eventId: userContacts.eventId,
      addedAt: userContacts.addedAt,
    })
    .from(userContacts)
    .innerJoin(contacts, eq(userContacts.contactId, contacts.id))
    .where(eq(userContacts.userId, userId))
    .orderBy(sql`${userContacts.addedAt} DESC`);

  return result;
}

/**
 * Get a single contact with user-specific data
 */
export async function getUserContact(userId: number, contactId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      // Contact fields
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      company: contacts.company,
      role: contacts.role,
      location: contacts.location,
      linkedinUrl: contacts.linkedinUrl,
      twitterUrl: contacts.twitterUrl,
      telegramUsername: contacts.telegramUsername,
      summary: contacts.summary,
      profilePictureUrl: contacts.profilePictureUrl,
      photoUrl: contacts.photoUrl,
      experience: contacts.experience,
      education: contacts.education,
      skills: contacts.skills,
      companyId: contacts.companyId,
      createdBy: contacts.createdBy,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
      
      // User-specific fields
      userContactId: userContacts.id,
      privateNotes: userContacts.privateNotes,
      notes: userContacts.privateNotes, // Backward compatibility
      relationshipStrength: userContacts.relationshipStrength,
      howWeMet: userContacts.howWeMet,
      lastContactedAt: userContacts.lastContactedAt,
      sentiment: userContacts.sentiment,
      interestLevel: userContacts.interestLevel,
      conversationSummary: userContacts.conversationSummary,
      actionItems: userContacts.actionItems,
      eventId: userContacts.eventId,
      addedAt: userContacts.addedAt,
    })
    .from(userContacts)
    .innerJoin(contacts, eq(userContacts.contactId, contacts.id))
    .where(
      and(
        eq(userContacts.userId, userId),
        eq(userContacts.contactId, contactId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update contact shared data (with provenance tracking)
 */
export async function updateContactSharedData(
  contactId: number,
  userId: number,
  updates: Partial<InsertContact>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current values for provenance
  const [current] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!current) throw new Error("Contact not found");

  // Track which fields changed
  const changedFields: Array<{ field: string; oldValue: string; newValue: string }> = [];
  
  for (const [key, newValue] of Object.entries(updates)) {
    const oldValue = current[key as keyof typeof current];
    if (oldValue !== newValue && newValue !== undefined) {
      changedFields.push({
        field: key,
        oldValue: String(oldValue || ''),
        newValue: String(newValue || ''),
      });
    }
  }

  // Update contact
  await db
    .update(contacts)
    .set(updates)
    .where(eq(contacts.id, contactId));

  // Log contributions
  for (const change of changedFields) {
    await db.insert(contactContributions).values({
      contactId,
      userId,
      fieldName: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      changeType: 'updated',
    });
  }

  return changedFields.length;
}

/**
 * Update user-specific contact data
 */
export async function updateUserContactData(
  userId: number,
  contactId: number,
  updates: Partial<InsertUserContact>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(userContacts)
    .set(updates)
    .where(
      and(
        eq(userContacts.userId, userId),
        eq(userContacts.contactId, contactId)
      )
    );
}

/**
 * Get all users who know a specific contact (for collaboration indicators)
 */
export async function getContactCollaborators(contactId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      addedAt: userContacts.addedAt,
    })
    .from(userContacts)
    .innerJoin(users, eq(userContacts.userId, users.id))
    .where(eq(userContacts.contactId, contactId))
    .orderBy(userContacts.addedAt);

  return result;
}

/**
 * Get contribution history for a contact
 */
export async function getContactContributions(contactId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: contactContributions.id,
      userId: contactContributions.userId,
      userName: users.name,
      fieldName: contactContributions.fieldName,
      oldValue: contactContributions.oldValue,
      newValue: contactContributions.newValue,
      changeType: contactContributions.changeType,
      createdAt: contactContributions.createdAt,
    })
    .from(contactContributions)
    .innerJoin(users, eq(contactContributions.userId, users.id))
    .where(eq(contactContributions.contactId, contactId))
    .orderBy(sql`${contactContributions.createdAt} DESC`);

  return result;
}

/**
 * Delete user-contact relationship (unlink contact from user)
 */
export async function unlinkUserContact(userId: number, contactId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(userContacts)
    .where(
      and(
        eq(userContacts.userId, userId),
        eq(userContacts.contactId, contactId)
      )
    );
  
  // Check if any other users are linked to this contact
  const remainingLinks = await db
    .select()
    .from(userContacts)
    .where(eq(userContacts.contactId, contactId));
  
  // If no one else knows this contact, delete it entirely
  if (remainingLinks.length === 0) {
    await db.delete(contacts).where(eq(contacts.id, contactId));
  }
}
