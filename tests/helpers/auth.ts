import { Page } from "@playwright/test";
import { execSync } from "child_process";

/**
 * Extract magic link token from Docker logs
 * In development mode, magic links are logged to the console
 */
export function getMagicLinkToken(): string {
  try {
    const logs = execSync("docker compose logs app | grep -A 15 'MAGIC LINK EMAIL' | tail -20", {
      encoding: "utf-8",
    });

    // Extract the token from the logs
    const tokenMatch = logs.match(/token=([^\s]+)/);

    if (!tokenMatch) {
      throw new Error("Could not find magic link token in logs");
    }

    return tokenMatch[1];
  } catch (error) {
    throw new Error(`Failed to extract magic link from logs: ${error}`);
  }
}

/**
 * Login helper function that handles the full magic link flow
 * @param page - Playwright page object
 * @param baseURL - Base URL of the application
 * @param email - Email address to login with
 */
export async function loginWithMagicLink(
  page: Page,
  baseURL: string,
  email: string = "scott@betterbrand.com"
): Promise<void> {
  // Navigate to the login page
  await page.goto("/");

  // Fill in the email address
  await page.getByRole("textbox", { name: "Email address" }).fill(email);

  // Click the "Send magic link" button
  await page.getByRole("button", { name: "Send magic link" }).click();

  // Wait for confirmation message
  await page.waitForSelector('text="Check your email"');

  // Extract the magic link token from logs
  const token = getMagicLinkToken();
  const magicLinkUrl = `${baseURL}/api/auth/magic-link/verify?token=${token}`;

  // Navigate to the magic link
  await page.goto(magicLinkUrl);

  // Wait for redirect to dashboard
  await page.waitForURL("/");
}

/**
 * Logout helper function
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/");
}
