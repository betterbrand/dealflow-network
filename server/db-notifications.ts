import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { notifications } from "../drizzle/schema";

/**
 * Notification system functions
 * Handles in-app notifications for access requests and other events
 */

export interface CreateNotificationInput {
  userId: number;
  type: "contact_access_request" | "contact_access_approved" | "contact_access_denied";
  title: string;
  message: string;
  actionUrl?: string;
  accessRequestId?: number;
  contactId?: number;
}

/**
 * Simple HTML sanitization to prevent XSS
 */
function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export async function createNotification(data: CreateNotificationInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Sanitize message to prevent XSS
  const sanitizedMessage = data.message ? sanitizeHtml(data.message) : null;

  const [notification] = await db.insert(notifications).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: sanitizedMessage,
    actionUrl: data.actionUrl,
    accessRequestId: data.accessRequestId,
    contactId: data.contactId,
  }).$returningId();

  return notification.id;
}

export async function getUserNotifications(userId: number, unreadOnly: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const query = db
    .select()
    .from(notifications)
    .where(
      unreadOnly
        ? and(eq(notifications.userId, userId), eq(notifications.isRead, 0))
        : eq(notifications.userId, userId)
    )
    .orderBy(desc(notifications.createdAt));

  return await query;
}

export async function markNotificationAsRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notifications)
    .set({ isRead: 1, readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId) // Ensure user owns notification
      )
    );
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notifications)
    .set({ isRead: 1, readAt: new Date() })
    .where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0)
      )
    );

  return result.length;
}
