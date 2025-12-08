import { describe, it, expect } from "vitest";
import { sendMagicLinkEmail } from "./_core/magic-link-email";

describe("Resend Email Integration", () => {
  it("should validate Resend API credentials by sending a test email", async () => {
    // Use a test email that won't actually deliver but will validate the API key
    const testEmail = process.env.RESEND_FROM_EMAIL?.match(/<(.+)>/)?.[1] || "test@example.com";
    const testMagicLink = "https://example.com/test-link";

    // This will validate that:
    // 1. RESEND_API_KEY is set and valid
    // 2. RESEND_FROM_EMAIL is set
    // 3. The Resend API is accessible
    const result = await sendMagicLinkEmail(testEmail, testMagicLink);

    expect(result).toBe(true);
  }, 30000); // 30 second timeout for API call
});
