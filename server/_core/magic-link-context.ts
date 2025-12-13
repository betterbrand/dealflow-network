import type { Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { verifySessionToken } from "./magic-link";
import { getUserByOpenId } from "../db";
import { User } from "../../drizzle/schema";

/**
 * Get the current user from the magic link session token
 */
export async function getUserFromMagicLink(
  req: Request,
  res: Response
): Promise<User | undefined> {
  try {
    // Get session token from cookie
    const sessionToken = req.cookies[COOKIE_NAME];

    if (!sessionToken) {
      return undefined;
    }

    // Verify session token
    const email = await verifySessionToken(sessionToken);

    if (!email) {
      // Invalid or expired token, clear cookie
      res.clearCookie(COOKIE_NAME);
      return undefined;
    }

    // Get user from database
    const openId = `magic-link:${email}`;
    const user = await getUserByOpenId(openId);

    return user;
  } catch (error) {
    console.error("Error getting user from magic link:", error);
    return undefined;
  }
}
