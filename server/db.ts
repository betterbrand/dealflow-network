import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

import { contacts, companies, events, conversations, socialProfiles, contactRelationships, contactPhotos, InsertContact, InsertCompany, InsertEvent, InsertConversation, InsertSocialProfile, InsertContactPhoto } from "../drizzle/schema";
import { and, desc, like, or, sql } from "drizzle-orm";

// ========== CONTACTS ==========

export async function createContact(data: InsertContact) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [contact] = await db.insert(contacts).values(data).$returningId();
  return contact.id;
}

export async function getContactById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllContacts(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const query = db.select({
    contact: contacts,
    company: companies,
    event: events,
  })
  .from(contacts)
  .leftJoin(companies, eq(contacts.companyId, companies.id))
  .leftJoin(events, eq(contacts.eventId, events.id))
  .orderBy(desc(contacts.createdAt));
  
  return await query;
}

export async function updateContact(id: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(contacts).set(data).where(eq(contacts.id, id));
}

export async function deleteContact(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(contacts).where(eq(contacts.id, id));
}

export async function searchContacts(query: string) {
  const db = await getDb();
  if (!db) return [];
  
  const searchPattern = `%${query}%`;
  return await db.select({
    contact: contacts,
    company: companies,
    event: events,
  })
  .from(contacts)
  .leftJoin(companies, eq(contacts.companyId, companies.id))
  .leftJoin(events, eq(contacts.eventId, events.id))
  .where(
    or(
      like(contacts.name, searchPattern),
      like(contacts.company, searchPattern),
      like(contacts.role, searchPattern),
      like(contacts.location, searchPattern)
    )
  )
  .orderBy(desc(contacts.createdAt));
}

// ========== COMPANIES ==========

export async function createCompany(data: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [company] = await db.insert(companies).values(data).$returningId();
  return company.id;
}

export async function getCompanyByName(name: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(companies).where(eq(companies.name, name)).limit(1);
  return result[0] || null;
}

export async function getAllCompanies() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(companies).orderBy(companies.name);
}

// ========== EVENTS ==========

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [event] = await db.insert(events).values(data).$returningId();
  return event.id;
}

export async function getEventByName(name: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(events).where(eq(events.name, name)).limit(1);
  return result[0] || null;
}

export async function getAllEvents() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(events).orderBy(desc(events.date));
}

// ========== CONVERSATIONS ==========

export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [conversation] = await db.insert(conversations).values(data).$returningId();
  return conversation.id;
}

// ========== SOCIAL PROFILES ==========

export async function createSocialProfile(data: InsertSocialProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [profile] = await db.insert(socialProfiles).values(data).$returningId();
  return profile.id;
}

export async function getSocialProfilesByContactId(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(socialProfiles).where(eq(socialProfiles.contactId, contactId));
}

// ========== CONTACT PHOTOS ==========

export async function createContactPhoto(data: InsertContactPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [photo] = await db.insert(contactPhotos).values(data).$returningId();
  return photo.id;
}

export async function getContactPhotos(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(contactPhotos).where(eq(contactPhotos.contactId, contactId));
}

// ========== KNOWLEDGE GRAPH ==========

export async function getContactsForGraph() {
  const db = await getDb();
  if (!db) return { nodes: [], links: [] };
  
  const allContacts = await db.select().from(contacts);
  const relationships = await db.select().from(contactRelationships);
  
  const nodes = allContacts.map(c => ({
    id: c.id,
    label: c.name,
    company: c.company,
    role: c.role,
  }));
  
  const links = relationships.map(r => ({
    source: r.fromContactId,
    target: r.toContactId,
    type: r.relationshipType,
  }));
  
  return { nodes, links };
}
