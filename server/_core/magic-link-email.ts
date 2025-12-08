import { ENV } from "./env";

/**
 * Send a magic link email to the user via Resend
 */
export async function sendMagicLinkEmail(
  email: string,
  magicLink: string
): Promise<boolean> {
  try {
    // Use Resend API to send email
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'DealFlow Network <onboarding@resend.dev>',
        to: email,
        subject: 'Your Magic Link to DealFlow Network',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Magic Link</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px;">
                        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827;">Welcome to DealFlow Network</h1>
                        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #4b5563;">Click the button below to securely sign in to your account:</p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 24px 0;">
                              <a href="${magicLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">Sign in to DealFlow Network</a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">This link will expire in 15 minutes for security reasons.</p>
                        <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">If you didn't request this email, you can safely ignore it.</p>
                        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9ca3af;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 18px; color: #2563eb; word-break: break-all;">${magicLink}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend API error:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('Magic link email sent successfully:', { id: data.id, to: email });
    return true;
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    return false;
  }
}
