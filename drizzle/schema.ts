import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Contacts table - SHARED contact pool across all users
 * Stores core contact information that is collaborative and shared
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  // Core identity fields (used for deduplication)
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }), // Primary dedup key
  linkedinUrl: varchar("linkedinUrl", { length: 500 }), // Secondary dedup key
  phone: varchar("phone", { length: 50 }),
  telegramUsername: varchar("telegramUsername", { length: 255 }),
  
  // Professional info (shared)
  company: varchar("company", { length: 255 }),
  role: varchar("role", { length: 255 }),
  location: varchar("location", { length: 255 }),
  
  // Imported data from LinkedIn/Twitter (shared)
  twitterUrl: varchar("twitterUrl", { length: 500 }),
  summary: text("summary"),
  profilePictureUrl: text("profilePictureUrl"),
  photoUrl: text("photoUrl"), // Deprecated, use profilePictureUrl
  experience: text("experience"), // JSON array
  education: text("education"), // JSON array
  skills: text("skills"), // JSON array

  // === STEP 1: Social Proof & Reach ===
  followers: int("followers"), // LinkedIn follower count
  connections: int("connections"), // LinkedIn connection count

  // === STEP 2: Visual Assets ===
  bannerImageUrl: text("bannerImageUrl"), // Profile banner image
  // Note: company/school logos stored in experience/education JSON arrays

  // === STEP 3: Name Parsing ===
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),

  // === STEP 4: External Links ===
  bioLinks: text("bioLinks"), // JSON array: [{title, link}]

  // === STEP 5: Recent Activity & Content ===
  posts: text("posts"), // JSON array of recent LinkedIn posts
  activity: text("activity"), // JSON array of recent activity

  // === STEP 6: Network Expansion ===
  peopleAlsoViewed: text("peopleAlsoViewed"), // JSON array of similar profiles

  // === Additional LinkedIn Metadata ===
  linkedinId: varchar("linkedinId", { length: 100 }), // LinkedIn profile ID
  linkedinNumId: varchar("linkedinNumId", { length: 100 }), // Numeric LinkedIn ID
  city: varchar("city", { length: 255 }), // Granular city (parsed from location)
  countryCode: varchar("countryCode", { length: 10 }), // ISO country code
  memorializedAccount: int("memorializedAccount").default(0), // Boolean: is memorial account
  educationDetails: text("educationDetails"), // Free-text education summary
  honorsAndAwards: text("honorsAndAwards"), // JSON object of awards

  // === Import Metadata ===
  lastImportedAt: timestamp("lastImportedAt"), // When profile was last imported
  importSource: varchar("importSource", { length: 50 }), // "brightdata", "scrapingdog", "manual", etc.
  importStatus: varchar("importStatus", { length: 50 }), // "pending", "complete", "failed", null

  // === Opportunity ===
  opportunity: text("opportunity"), // Why this contact matters - deal/opportunity context

  // Metadata
  companyId: int("companyId").references(() => companies.id),
  createdBy: int("createdBy").notNull().references(() => users.id), // Who first created this contact
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * User-Contact junction table - tracks which users know which contacts
 * Stores user-specific relationship data and private information
 */
export const userContacts = mysqlTable("userContacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: int("contactId").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  
  // User-specific relationship data
  privateNotes: text("privateNotes"), // Private notes only this user can see
  relationshipStrength: varchar("relationshipStrength", { length: 50 }), // strong, medium, weak
  howWeMet: text("howWeMet"), // Context of how this user met the contact
  lastContactedAt: timestamp("lastContactedAt"),
  sentiment: varchar("sentiment", { length: 50 }), // User's sentiment about this contact
  interestLevel: varchar("interestLevel", { length: 50 }), // User's interest level
  
  // Conversation data (user-specific)
  conversationSummary: text("conversationSummary"),
  actionItems: text("actionItems"),
  
  // Event context
  eventId: int("eventId").references(() => events.id),
  
  // Metadata
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserContact = typeof userContacts.$inferSelect;
export type InsertUserContact = typeof userContacts.$inferInsert;

/**
 * Contact contributions table - tracks who added/updated what fields
 * Provides full provenance and audit trail for collaborative editing
 */
export const contactContributions = mysqlTable("contactContributions", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id),
  
  // What was changed
  fieldName: varchar("fieldName", { length: 100 }).notNull(), // e.g., "linkedinUrl", "summary", "role"
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  changeType: varchar("changeType", { length: 50 }).notNull(), // "created", "updated", "enriched"
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactContribution = typeof contactContributions.$inferSelect;
export type InsertContactContribution = typeof contactContributions.$inferInsert;

/**
 * Companies table - stores organizations that contacts work for
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }),
  description: text("description"),
  industry: varchar("industry", { length: 255 }),
  location: varchar("location", { length: 255 }),
  website: varchar("website", { length: 500 }),
  logoUrl: text("logoUrl"),
  size: varchar("size", { length: 50 }),
  foundedYear: int("foundedYear"),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  twitterUrl: varchar("twitterUrl", { length: 500 }),
  employeeCount: int("employeeCount"),
  fundingStage: varchar("fundingStage", { length: 100 }),
  totalFunding: varchar("totalFunding", { length: 100 }),
  tags: text("tags"), // JSON array
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Events table - stores networking events where contacts were made
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  date: timestamp("date"),
  location: varchar("location", { length: 500 }),
  type: varchar("type", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Conversations table - stores original Telegram conversation metadata
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  telegramChatId: varchar("telegramChatId", { length: 255 }),
  rawMessages: text("rawMessages"),
  capturedBy: int("capturedBy").notNull().references(() => users.id),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Social profiles table - stores LinkedIn, Twitter, and other social media links
 */
export const socialProfiles = mysqlTable("socialProfiles", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 50 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  profileData: text("profileData"),
  lastImported: timestamp("lastImported"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialProfile = typeof socialProfiles.$inferSelect;
export type InsertSocialProfile = typeof socialProfiles.$inferInsert;

/**
 * Contact relationships table - for building the knowledge graph
 * Stores relationships like "introduced_by", "works_with", "met_at_same_event"
 */
export const contactRelationships = mysqlTable("contactRelationships", {
  id: int("id").autoincrement().primaryKey(),
  fromContactId: int("fromContactId").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  toContactId: int("toContactId").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  relationshipType: varchar("relationshipType", { length: 100 }).notNull(),
  strength: int("strength"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactRelationship = typeof contactRelationships.$inferSelect;
export type InsertContactRelationship = typeof contactRelationships.$inferInsert;

/**
 * Contact photos table - stores multiple photos per contact
 */
export const contactPhotos = mysqlTable("contactPhotos", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  photoUrl: varchar("photoUrl", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  uploadedBy: int("uploadedBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactPhoto = typeof contactPhotos.$inferSelect;
export type InsertContactPhoto = typeof contactPhotos.$inferInsert;
/**
 * Query history table - stores AI query searches for quick reuse
 */
export const queryHistory = mysqlTable("queryHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  intent: varchar("intent", { length: 50 }),
  resultCount: int("resultCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QueryHistory = typeof queryHistory.$inferSelect;
export type InsertQueryHistory = typeof queryHistory.$inferInsert;

/**
 * Authorized users table - stores whitelisted email addresses for magic link authentication
 * Persists authorized users across server restarts
 */
export const authorizedUsers = mysqlTable("authorizedUsers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  addedBy: int("addedBy").references(() => users.id), // Which admin added this user
  notes: text("notes"), // Optional notes about why this user was added
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AuthorizedUser = typeof authorizedUsers.$inferSelect;
export type InsertAuthorizedUser = typeof authorizedUsers.$inferInsert;

/**
 * RDF Triples table - persistent storage for semantic graph data
 * Stores subject-predicate-object triples derived from LinkedIn profiles
 * Used for SPARQL-like queries and semantic relationship traversal
 */
export const rdfTriples = mysqlTable("rdfTriples", {
  id: int("id").autoincrement().primaryKey(),

  // Triple components (subject-predicate-object)
  subject: varchar("subject", { length: 512 }).notNull(),    // e.g., "linkedin:satyanadella"
  predicate: varchar("predicate", { length: 512 }).notNull(), // e.g., "https://schema.org/name"
  object: text("object").notNull(),                           // e.g., "Satya Nadella" or "org:microsoft"
  objectType: varchar("objectType", { length: 20 }).notNull(), // "literal" | "uri"

  // Source tracking - which contact this triple belongs to
  contactId: int("contactId").references(() => contacts.id, { onDelete: "cascade" }),

  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  // Indexes for fast queries
  subjectIdx: index("idx_rdf_subject").on(table.subject),
  predicateIdx: index("idx_rdf_predicate").on(table.predicate),
  contactIdx: index("idx_rdf_contact").on(table.contactId),
}));

export type RdfTriple = typeof rdfTriples.$inferSelect;
export type InsertRdfTriple = typeof rdfTriples.$inferInsert;
