import { Router } from "express";
import { generateMagicLinkToken } from "./magic-link";

/**
 * DEV ONLY: Endpoint to generate magic links for testing
 * This bypasses email and shows the link directly in the browser
 */
export const devMagicLinkRouter = Router();

devMagicLinkRouter.get("/generate", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Generate Magic Link</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            input { width: 100%; padding: 10px; font-size: 16px; margin: 10px 0; }
            button { width: 100%; padding: 12px; font-size: 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; }
            button:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <h1>Generate Magic Link (DEV ONLY)</h1>
          <form method="get">
            <label>Email address:</label>
            <input type="email" name="email" placeholder="scott@betterbrand.com" required />
            <button type="submit">Generate Magic Link</button>
          </form>
        </body>
        </html>
      `);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const token = await generateMagicLinkToken(normalizedEmail);
    const baseUrl = req.protocol + "://" + req.get("host");
    const magicLink = `${baseUrl}/api/auth/magic-link/verify?token=${token}`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Magic Link Generated</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
          .success { background: #dcfce7; border: 1px solid #86efac; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .link { background: #f3f4f6; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; margin: 10px 0; }
          a { color: #2563eb; text-decoration: none; }
          a:hover { text-decoration: underline; }
          button { padding: 12px 24px; font-size: 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px; }
          button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <h1>✅ Magic Link Generated</h1>
        <div class="success">
          <p><strong>Email:</strong> ${normalizedEmail}</p>
          <p><strong>Expires:</strong> 15 minutes</p>
        </div>
        <h2>Your Magic Link:</h2>
        <div class="link">${magicLink}</div>
        <p><a href="${magicLink}">Click here to log in</a></p>
        <button onclick="window.location.href='/dev/magic-link/generate'">Generate Another Link</button>
      </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #fee2e2; border: 1px solid #fca5a5; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>❌ Error</h1>
        <div class="error">
          <p>${error.message}</p>
          <p>Make sure the email is in the authorized users list.</p>
        </div>
        <p><a href="/dev/magic-link/generate">Try again</a></p>
      </body>
      </html>
    `);
  }
});
