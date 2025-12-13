import { Router } from "express";
import {
  generateMagicLinkToken,
  verifyMagicLinkToken,
  generateSessionToken,
  isAuthorizedUser,
} from "./magic-link";
import { sendMagicLinkEmail } from "./magic-link-email";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "@shared/const";
import { upsertUser } from "../db";

export const magicLinkRouter = Router();

/**
 * POST /api/auth/magic-link/request
 * Request a magic link to be sent to the user's email
 */
magicLinkRouter.post("/request", async (req: any, res: any) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user is authorized
    const isAuthorized = await isAuthorizedUser(normalizedEmail);
    if (!isAuthorized) {
      // Don't reveal if email is unauthorized for security
      return res.json({
        success: true,
        message: "If your email is authorized, you will receive a magic link.",
      });
    }

    // Generate magic link token
    const token = await generateMagicLinkToken(normalizedEmail);

    // Build magic link URL
    const baseUrl = req.protocol + "://" + req.get("host");
    const magicLink = `${baseUrl}/api/auth/magic-link/verify?token=${token}`;

    // Send magic link email
    const emailSent = await sendMagicLinkEmail(normalizedEmail, magicLink);

    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send magic link" });
    }

    res.json({
      success: true,
      message: "Magic link sent! Check your email.",
    });
  } catch (error) {
    console.error("Magic link request error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

/**
 * GET /api/auth/magic-link/verify?token=xxx
 * Verify the magic link token and create a session
 */
magicLinkRouter.get("/verify", async (req: any, res: any) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).send("Invalid magic link");
    }

    // Verify the magic link token
    const email = await verifyMagicLinkToken(token);

    if (!email) {
      return res.status(401).send("Invalid or expired magic link");
    }

    // Create or update user in database
    await upsertUser({
      openId: `magic-link:${email}`, // Use email as unique identifier
      email,
      name: email.split("@")[0], // Use email prefix as default name
      loginMethod: "magic-link",
    });

    // Generate session token
    const sessionToken = generateSessionToken(email);

    // Set session cookie
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

    // Redirect to app
    res.redirect("/");
  } catch (error) {
    console.error("Magic link verification error:", error);
    res.status(500).send("Failed to verify magic link");
  }
});

/**
 * POST /api/auth/logout
 * Clear the session cookie
 */
magicLinkRouter.post("/logout", (req: any, res: any) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});
