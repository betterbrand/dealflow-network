import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

/**
 * Helper function to extract magic link from Docker logs
 * In development mode, magic links are logged to the console
 */
function getMagicLinkFromLogs(baseURL: string): string {
  try {
    const logs = execSync("docker compose logs app | grep -A 15 'MAGIC LINK EMAIL' | tail -20", {
      encoding: "utf-8",
    });

    // Extract the token from the logs (works regardless of the base URL)
    const tokenMatch = logs.match(/token=([^\s]+)/);

    if (!tokenMatch) {
      throw new Error("Could not find magic link token in logs");
    }

    const token = tokenMatch[1];
    return `${baseURL}/api/auth/magic-link/verify?token=${token}`;
  } catch (error) {
    throw new Error(`Failed to extract magic link from logs: ${error}`);
  }
}

test.describe("Magic Link Authentication", () => {
  test("should successfully login with magic link", async ({ page, baseURL }) => {
    // Navigate to the login page
    await page.goto("/");

    // Verify we're on the login page
    await expect(page.getByText("DealFlow Network")).toBeVisible();
    await expect(page.getByText("Sign in to your account")).toBeVisible();

    // Fill in the email address
    const email = "scott@betterbrand.com";
    await page.getByRole("textbox", { name: "Email address" }).fill(email);

    // Click the "Send magic link" button
    await page.getByRole("button", { name: "Send magic link" }).click();

    // Verify the confirmation message
    await expect(page.getByText("Check your email")).toBeVisible();
    await expect(page.getByText(`We've sent a magic link to`)).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    // Extract the magic link from Docker logs
    const magicLinkUrl = getMagicLinkFromLogs(baseURL!);
    console.log("Magic link URL:", magicLinkUrl);

    // Navigate to the magic link
    await page.goto(magicLinkUrl);

    // Wait for redirect to dashboard
    await page.waitForURL("/");

    // Verify we're now logged in and on the dashboard
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Welcome to your networking command center")).toBeVisible();

    // Verify dashboard cards are present
    await expect(page.getByText("Total Contacts")).toBeVisible();
    await expect(page.getByText("Organizations tracked")).toBeVisible();
    await expect(page.getByText("Networking events attended")).toBeVisible();
    await expect(page.getByText("Visualize connections")).toBeVisible();

    // Verify sidebar navigation is present
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Contacts", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Companies", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Knowledge Graph", exact: true })).toBeVisible();

    // Verify user profile is visible
    await expect(page.getByText(email)).toBeVisible();
  });

  test("should show error for invalid magic link", async ({ page }) => {
    // Navigate directly to an invalid magic link
    await page.goto("/api/auth/magic-link/verify?token=invalid-token");

    // Should show error message
    await expect(page.getByText("Invalid or expired magic link")).toBeVisible();
  });

  test("should logout successfully", async ({ page, baseURL }) => {
    // First, login
    await page.goto("/");
    await page.getByRole("textbox", { name: "Email address" }).fill("scott@betterbrand.com");
    await page.getByRole("button", { name: "Send magic link" }).click();

    const magicLinkUrl = getMagicLinkFromLogs(baseURL!);
    await page.goto(magicLinkUrl);
    await page.waitForURL("/");

    // Now logout
    await page.getByRole("button", { name: "Sign out" }).click();

    // Verify we're back on the login page
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });
});

test.describe("Protected Routes", () => {
  test("should redirect to login when accessing protected route without auth", async ({ page }) => {
    // Try to access a protected route without being logged in
    await page.goto("/contacts");

    // Should show login page (URL might still be /contacts but content should be login form)
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email address" })).toBeVisible();
  });

  test("should access protected routes when authenticated", async ({ page, baseURL }) => {
    // Login first
    await page.goto("/");
    await page.getByRole("textbox", { name: "Email address" }).fill("scott@betterbrand.com");
    await page.getByRole("button", { name: "Send magic link" }).click();

    const magicLinkUrl = getMagicLinkFromLogs(baseURL!);
    await page.goto(magicLinkUrl);
    await page.waitForURL("/");

    // Navigate to contacts page
    await page.getByRole("button", { name: "Contacts" }).click();
    await page.waitForURL("/contacts");

    // Verify we're on the contacts page
    await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
  });
});
