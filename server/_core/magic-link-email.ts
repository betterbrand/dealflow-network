import { ENV } from "./env";

/**
 * Send a magic link email to the user
 * Uses a simple fetch to send email (you can integrate with SendGrid, Resend, etc.)
 */
export async function sendMagicLinkEmail(
  email: string,
  magicLink: string
): Promise<boolean> {
  try {
    // For MVP, we'll log the magic link to console
    // In production, integrate with an email service like Resend, SendGrid, or AWS SES
    console.log(`
==============================================
MAGIC LINK LOGIN
==============================================
Email: ${email}
Magic Link: ${magicLink}
==============================================
Click the link above to log in.
Link expires in 15 minutes.
==============================================
    `);

    // TODO: Replace with actual email service
    // Example with Resend:
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'DealFlow Network <login@yourdomain.com>',
    //     to: email,
    //     subject: 'Your Magic Link to DealFlow Network',
    //     html: `
    //       <h2>Welcome to DealFlow Network</h2>
    //       <p>Click the link below to log in:</p>
    //       <a href="${magicLink}">Log in to DealFlow Network</a>
    //       <p>This link expires in 15 minutes.</p>
    //     `,
    //   }),
    // });

    return true;
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    return false;
  }
}
