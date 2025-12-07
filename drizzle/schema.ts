import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
 * Contacts table - stores people met at networking events
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  role: varchar("role", { length: 255 }),
  location: varchar("location", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  telegramUsername: varchar("telegramUsername", { length: 255 }),
  photoUrl: text("photoUrl"),
  notes: text("notes"),
  conversationSummary: text("conversationSummary"),
  actionItems: text("actionItems"),
  sentiment: varchar("sentiment", { length: 50 }),
  interestLevel: varchar("interestLevel", { length: 50 }),
  // Enriched data from LinkedIn/Twitter
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  twitterUrl: varchar("twitterUrl", { length: 500 }),
  summary: text("summary"),
  profilePictureUrl: text("profilePictureUrl"),
  experience: text("experience"), // JSON array
  education: text("education"), // JSON array
  skills: text("skills"), // JSON array
  addedBy: int("addedBy").notNull().references(() => users.id),
  eventId: int("eventId").references(() => events.id),
  companyId: int("companyId").references(() => companies.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

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
  lastEnriched: timestamp("lastEnriched"),
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
