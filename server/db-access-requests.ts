import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { contactAccessRequests, contacts, users, userContacts, notifications } from "../drizzle/schema";
import { createNotification } from "./db-notifications";

/**
 * Access request management functions
 * Handles requesting, approving, and denying access to private contacts
 */

export async function requestContactAccess(
  requesterId: number,
  contactId: number,
  message?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Rate limiting - max 10 requests per hour
  const recentRequests = await db
    .select()
    .from(contactAccessRequests)
    .where(
      and(
        eq(contactAccessRequests.requesterId, requesterId),
        sql`${contactAccessRequests.createdAt} > DATE_SUB(NOW(), INTERVAL 1 HOUR)`
      )
    );

  if (recentRequests.length >= 10) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. You can only request access to 10 contacts per hour."
    });
  }

  // Check if contact exists and is private
  const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
  }
  if (!contact[0].isPrivate) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Contact is not private" });
  }
  if (contact[0].createdBy === requesterId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You own this contact" });
  }

  // Check for existing request
  const existing = await db
    .select()
    .from(contactAccessRequests)
    .where(
      and(
        eq(contactAccessRequests.contactId, contactId),
        eq(contactAccessRequests.requesterId, requesterId)
      )
    )
    .limit(1);

  if (existing.length) {
    if (existing[0].status === "pending") {
      throw new TRPCError({ code: "CONFLICT", message: "You already have a pending request" });
    }
    if (existing[0].status === "approved") {
      throw new TRPCError({ code: "CONFLICT", message: "You already have access" });
    }
    // If denied, allow re-request by creating new request
  }

  // Use database transaction for consistency
  const result = await db.transaction(async (tx) => {
    // Create access request
    const [request] = await tx.insert(contactAccessRequests).values({
      contactId,
      requesterId,
      message,
      status: "pending",
    }).$returningId();

    // Create notification for contact owner
    await tx.insert(notifications).values({
      userId: contact[0].createdBy!,
      type: "contact_access_request",
      title: "Contact Access Request",
      message: `A user has requested access to your contact: ${contact[0].name}`,
      accessRequestId: request.id,
      contactId: contactId,
      actionUrl: `/contacts/${contactId}`,
    });

    return request.id;
  });

  return result;
}

export async function approveContactAccess(
  requestId: number,
  approverId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get request
  const request = await db
    .select()
    .from(contactAccessRequests)
    .where(eq(contactAccessRequests.id, requestId))
    .limit(1);

  if (!request.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
  }
  if (request[0].status !== "pending") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
  }

  // Verify approver is the contact owner
  const contact = await db.select().from(contacts).where(eq(contacts.id, request[0].contactId)).limit(1);
  if (!contact.length || contact[0].createdBy !== approverId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only contact owner can approve access"
    });
  }

  // Use database transaction
  await db.transaction(async (tx) => {
    // Update request status
    await tx
      .update(contactAccessRequests)
      .set({
        status: "approved",
        respondedAt: new Date(),
        respondedBy: approverId
      })
      .where(eq(contactAccessRequests.id, requestId));

    // Create userContacts link for requester
    await tx.insert(userContacts).values({
      userId: request[0].requesterId,
      contactId: request[0].contactId,
    });

    // Notify requester
    await tx.insert(notifications).values({
      userId: request[0].requesterId,
      type: "contact_access_approved",
      title: "Access Request Approved",
      message: `Your request to access ${contact[0].name} has been approved`,
      accessRequestId: requestId,
      contactId: request[0].contactId,
      actionUrl: `/contacts/${request[0].contactId}`,
    });
  });
}

export async function denyContactAccess(
  requestId: number,
  deniedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get request
  const request = await db
    .select()
    .from(contactAccessRequests)
    .where(eq(contactAccessRequests.id, requestId))
    .limit(1);

  if (!request.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
  }
  if (request[0].status !== "pending") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
  }

  // Verify denier is the contact owner
  const contact = await db.select().from(contacts).where(eq(contacts.id, request[0].contactId)).limit(1);
  if (!contact.length || contact[0].createdBy !== deniedBy) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only contact owner can deny access"
    });
  }

  // Use database transaction
  await db.transaction(async (tx) => {
    // Update request status
    await tx
      .update(contactAccessRequests)
      .set({
        status: "denied",
        respondedAt: new Date(),
        respondedBy: deniedBy
      })
      .where(eq(contactAccessRequests.id, requestId));

    // Notify requester
    await tx.insert(notifications).values({
      userId: request[0].requesterId,
      type: "contact_access_denied",
      title: "Access Request Denied",
      message: `Your request to access ${contact[0].name} has been denied`,
      accessRequestId: requestId,
      contactId: request[0].contactId,
    });
  });
}

export async function getPendingAccessRequests(contactOwnerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all contacts owned by user with pending requests
  const requests = await db
    .select({
      request: contactAccessRequests,
      contact: contacts,
      requester: users,
    })
    .from(contactAccessRequests)
    .innerJoin(contacts, eq(contactAccessRequests.contactId, contacts.id))
    .innerJoin(users, eq(contactAccessRequests.requesterId, users.id))
    .where(
      and(
        eq(contacts.createdBy, contactOwnerId),
        eq(contactAccessRequests.status, "pending")
      )
    );

  return requests;
}
