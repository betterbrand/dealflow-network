import { eq, sql, and, desc, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  contacts, companies, events, conversations, socialProfiles, contactRelationships, contactPhotos,
  InsertContact, InsertCompany, InsertEvent, InsertConversation, InsertSocialProfile, InsertContactPhoto, InsertContactRelationship
} from "../drizzle/schema";
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



// ========== CONTACTS ==========

/**
 * @deprecated Use createOrLinkContact from db-collaborative.ts instead
 * This function is kept for backward compatibility but doesn't support collaborative features
 */
export async function createContact(data: InsertContact) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [contact] = await db.insert(contacts).values(data).$returningId();
  return contact.id;
}

/**
 * @deprecated Use getUserContact from db-collaborative.ts instead
 * This function returns raw contact data without user-specific fields
 */
export async function getContactById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return result[0] || null;
}

/**
 * @deprecated Use getUserContacts from db-collaborative.ts instead
 * This function is kept for backward compatibility
 */
export async function getAllContacts(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (userId) {
    // Use collaborative model
    const { getUserContacts } = await import("./db-collaborative");
    const userContactsData = await getUserContacts(userId);
    
    // Transform to old format for backward compatibility
    return userContactsData.map(uc => ({
      contact: {
        id: uc.id,
        name: uc.name,
        email: uc.email,
        phone: uc.phone,
        company: uc.company,
        role: uc.role,
        location: uc.location,
        linkedinUrl: uc.linkedinUrl,
        twitterUrl: uc.twitterUrl,
        telegramUsername: uc.telegramUsername,
        summary: uc.summary,
        profilePictureUrl: uc.profilePictureUrl,
        photoUrl: uc.photoUrl,
        experience: uc.experience,
        education: uc.education,
        skills: uc.skills,
        companyId: uc.companyId,
        createdBy: uc.createdBy,
        createdAt: uc.createdAt,
        updatedAt: uc.updatedAt,
        // NEW: Enrichment fields
        followers: uc.followers,
        connections: uc.connections,
        bannerImageUrl: uc.bannerImageUrl,
        firstName: uc.firstName,
        lastName: uc.lastName,
        bioLinks: uc.bioLinks,
        posts: uc.posts,
        activity: uc.activity,
        peopleAlsoViewed: uc.peopleAlsoViewed,
        linkedinId: uc.linkedinId,
        linkedinNumId: uc.linkedinNumId,
        city: uc.city,
        countryCode: uc.countryCode,
        memorializedAccount: uc.memorializedAccount,
        educationDetails: uc.educationDetails,
        honorsAndAwards: uc.honorsAndAwards,
        lastEnrichedAt: uc.lastEnrichedAt,
        enrichmentSource: uc.enrichmentSource,
        // Map user-specific fields back to contact for compatibility
        notes: uc.privateNotes,
        conversationSummary: uc.conversationSummary,
        actionItems: uc.actionItems,
        sentiment: uc.sentiment,
        interestLevel: uc.interestLevel,
      },
      company: null, // TODO: join companies if needed
      event: null, // Event is now in userContacts
    }));
  }
  
  // Fallback: return all contacts (admin view)
  const query = db.select({
    contact: contacts,
    company: companies,
  })
  .from(contacts)
  .leftJoin(companies, eq(contacts.companyId, companies.id))
  .orderBy(desc(contacts.createdAt));
  
  const result = await query;
  return result.map(r => ({ ...r, event: null }));
}

/**
 * @deprecated Use updateContactSharedData or updateUserContactData from db-collaborative.ts
 */
export async function updateContact(id: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(contacts).set(data).where(eq(contacts.id, id));
}

/**
 * @deprecated Use unlinkUserContact from db-collaborative.ts instead
 */
export async function deleteContact(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(contacts).where(eq(contacts.id, id));
}

export async function searchContacts(query: string) {
  const db = await getDb();
  if (!db) return [];
  
  const searchPattern = `%${query}%`;
  const result = db.select({
    contact: contacts,
    company: companies,
  })
  .from(contacts)
  .leftJoin(companies, eq(contacts.companyId, companies.id))
  .where(
    or(
      like(contacts.name, searchPattern),
      like(contacts.company, searchPattern),
      like(contacts.role, searchPattern),
      like(contacts.location, searchPattern)
    )
  )  .orderBy(desc(contacts.createdAt));
  
  return await result;
}

// ========== COMPANIES ==========

export async function createCompany(data: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [company] = await db.insert(companies).values(data).$returningId();
  return company.id;
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result[0] || null;
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

export async function updateCompany(id: number, data: Partial<InsertCompany>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(companies).set(data).where(eq(companies.id, id));
}

export async function deleteCompany(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(companies).where(eq(companies.id, id));
}

export async function getCompanyWithContacts(companyId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const company = await getCompanyById(companyId);
  if (!company) return null;
  
  const companyContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.companyId, companyId))
    .orderBy(desc(contacts.createdAt));
  
  return {
    ...company,
    contacts: companyContacts,
    contactCount: companyContacts.length,
  };
}

export async function getCompaniesWithStats() {
  const db = await getDb();
  if (!db) return [];
  
  const allCompanies = await db.select().from(companies).orderBy(companies.name);
  
  const companiesWithStats = await Promise.all(
    allCompanies.map(async (company) => {
      const companyContacts = await db
        .select()
        .from(contacts)
        .where(eq(contacts.companyId, company.id));
      
      return {
        ...company,
        contactCount: companyContacts.length,
      };
    })
  );
  
  return companiesWithStats;
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

// ========== RELATIONSHIPS ==========

export async function createRelationship(data: InsertContactRelationship) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(contactRelationships).values(data);
  return result;
}

export async function getRelationshipsForContact(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get relationships where this contact is either the source or target
  const outgoing = await db
    .select({
      id: contactRelationships.id,
      fromContactId: contactRelationships.fromContactId,
      toContactId: contactRelationships.toContactId,
      relationshipType: contactRelationships.relationshipType,
      strength: contactRelationships.strength,
      notes: contactRelationships.notes,
      createdAt: contactRelationships.createdAt,
      relatedContact: contacts,
      direction: sql<'outgoing'>`'outgoing'`,
    })
    .from(contactRelationships)
    .innerJoin(contacts, eq(contactRelationships.toContactId, contacts.id))
    .where(eq(contactRelationships.fromContactId, contactId));
  
  const incoming = await db
    .select({
      id: contactRelationships.id,
      fromContactId: contactRelationships.fromContactId,
      toContactId: contactRelationships.toContactId,
      relationshipType: contactRelationships.relationshipType,
      strength: contactRelationships.strength,
      notes: contactRelationships.notes,
      createdAt: contactRelationships.createdAt,
      relatedContact: contacts,
      direction: sql<'incoming'>`'incoming'`,
    })
    .from(contactRelationships)
    .innerJoin(contacts, eq(contactRelationships.fromContactId, contacts.id))
    .where(eq(contactRelationships.toContactId, contactId));
  
  return [...outgoing, ...incoming];
}

export async function deleteRelationship(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(contactRelationships).where(eq(contactRelationships.id, id));
  return { success: true };
}


/**
 * Update contact with enriched data from LinkedIn/Twitter
 */
export async function updateContactEnrichment(
  contactId: number,
  enrichedData: {
    // Core fields (existing)
    summary?: string;
    profilePictureUrl?: string;
    experience?: Array<any>;
    education?: Array<any>;
    skills?: string[];
    company?: string;
    role?: string;
    location?: string;

    // === NEW: Step 1 - Social Proof ===
    followers?: number;
    connections?: number;

    // === NEW: Step 2 - Visual Assets ===
    bannerImageUrl?: string;

    // === NEW: Step 3 - Name Parsing ===
    firstName?: string;
    lastName?: string;

    // === NEW: Step 4 - External Links ===
    bioLinks?: Array<{ title: string; link: string }>;

    // === NEW: Step 5 - Content & Activity ===
    posts?: Array<any>;
    activity?: Array<any>;

    // === NEW: Step 6 - Network ===
    peopleAlsoViewed?: Array<any>;

    // === NEW: Additional Metadata ===
    linkedinId?: string;
    linkedinNumId?: string;
    city?: string;
    countryCode?: string;
    memorializedAccount?: boolean;
    educationDetails?: string;
    honorsAndAwards?: any;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update contact enrichment: database not available");
    return;
  }

  try {
    const updateData: Record<string, any> = {};

    // Existing fields
    if (enrichedData.summary) updateData.summary = enrichedData.summary;
    if (enrichedData.profilePictureUrl) updateData.profilePictureUrl = enrichedData.profilePictureUrl;
    if (enrichedData.experience) updateData.experience = JSON.stringify(enrichedData.experience);
    if (enrichedData.education) updateData.education = JSON.stringify(enrichedData.education);
    if (enrichedData.skills) updateData.skills = JSON.stringify(enrichedData.skills);
    if (enrichedData.company) updateData.company = enrichedData.company;
    if (enrichedData.role) updateData.role = enrichedData.role;
    if (enrichedData.location) updateData.location = enrichedData.location;

    // === Step 1: Social Proof ===
    if (enrichedData.followers !== undefined) updateData.followers = enrichedData.followers;
    if (enrichedData.connections !== undefined) updateData.connections = enrichedData.connections;

    // === Step 2: Visual Assets ===
    if (enrichedData.bannerImageUrl) updateData.bannerImageUrl = enrichedData.bannerImageUrl;

    // === Step 3: Name Parsing ===
    if (enrichedData.firstName) updateData.firstName = enrichedData.firstName;
    if (enrichedData.lastName) updateData.lastName = enrichedData.lastName;

    // === Step 4: External Links ===
    if (enrichedData.bioLinks) updateData.bioLinks = JSON.stringify(enrichedData.bioLinks);

    // === Step 5: Content & Activity ===
    if (enrichedData.posts) updateData.posts = JSON.stringify(enrichedData.posts);
    if (enrichedData.activity) updateData.activity = JSON.stringify(enrichedData.activity);

    // === Step 6: Network ===
    if (enrichedData.peopleAlsoViewed) updateData.peopleAlsoViewed = JSON.stringify(enrichedData.peopleAlsoViewed);

    // === Additional Metadata ===
    if (enrichedData.linkedinId) updateData.linkedinId = enrichedData.linkedinId;
    if (enrichedData.linkedinNumId) updateData.linkedinNumId = enrichedData.linkedinNumId;
    if (enrichedData.city) updateData.city = enrichedData.city;
    if (enrichedData.countryCode) updateData.countryCode = enrichedData.countryCode;
    if (enrichedData.memorializedAccount !== undefined) updateData.memorializedAccount = enrichedData.memorializedAccount ? 1 : 0;
    if (enrichedData.educationDetails) updateData.educationDetails = enrichedData.educationDetails;
    if (enrichedData.honorsAndAwards) updateData.honorsAndAwards = JSON.stringify(enrichedData.honorsAndAwards);

    // Enrichment metadata
    updateData.lastEnrichedAt = new Date();
    updateData.enrichmentSource = 'brightdata';

    if (Object.keys(updateData).length > 0) {
      await db.update(contacts)
        .set(updateData)
        .where(eq(contacts.id, contactId));

      console.log(`[Database] Updated contact ${contactId} with enriched data`);
      console.log(`[Database] Saved company: ${enrichedData.company || 'none'}, role: ${enrichedData.role || 'none'}`);
      console.log(`[Database] Saved ${enrichedData.followers || 0} followers, ${enrichedData.posts?.length || 0} posts, ${enrichedData.peopleAlsoViewed?.length || 0} network suggestions`);
    }
  } catch (error) {
    console.error(`[Database] Failed to update contact enrichment:`, error);
    throw error;
  }
}
