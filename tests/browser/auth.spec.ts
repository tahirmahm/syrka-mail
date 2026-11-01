import { test, expect } from "@playwright/test";
test("settings names missing configuration and each provider blocker", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".shell")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Connect an email account" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".configuration-note")).toContainText(
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  await expect(dialog.locator(".provider-status")).toHaveText([
    "Not configured",
    "Not configured",
    "Not configured",
  ]);
  await expect(
    dialog.getByRole("button", { name: "Send sign-in link" }),
  ).toBeDisabled();
  await expect(dialog.locator(".provider-blocker").first()).toContainText(
    "GMAIL_CLIENT_ID",
  );
  await expect(dialog.locator(".provider-blocker").nth(1)).toContainText(
    "MICROSOFT_CLIENT_ID",
  );
  await expect(dialog.locator(".provider-blocker").nth(2)).toContainText(
    "ZOHO_CLIENT_ID",
  );
  await page.screenshot({
    path: "artifacts/connections-required.png",
    fullPage: true,
  });
});
test("configured magic-link request includes explicit PKCE callback (mock service contract)", async ({
  page,
}) => {
  let requestBody: any;
  let redirect = "";
  await page.route("**/api/config", (route) =>
    route.fulfill({
      json: {
        auth: {
          configured: true,
          missing: [],
          message: "Test configuration only",
        },
        publicAuth: {
          url: "http://127.0.0.1:3000/test-auth",
          anonKey: "fictional-anon-key",
        },
        providers: {},
        ai: { enabled: false },
      },
    }),
  );
  await page.route("**/test-auth/auth/v1/otp*", async (route) => {
    requestBody = route.request().postDataJSON();
    redirect =
      new URL(route.request().url()).searchParams.get("redirect_to") || "";
    await route.fulfill({ json: {} });
  });
  await page.goto("/");
  await expect(page.locator(".shell")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Connect an email account" }).click();
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("fictional-user@example.com");
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Sign-in link requested",
  );
  expect(requestBody.email).toBe("fictional-user@example.com");
  expect(requestBody.code_challenge).toBeTruthy();
  expect(redirect).toBe("http://127.0.0.1:3000/auth/callback");
});
test("callback has a clear recovery path when configuration is missing", async ({
  page,
}) => {
  await page.goto("/auth/callback?code=fictional-code");
  await expect(page.locator(".auth-callback [role=alert]")).toContainText(
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  await expect(
    page.getByRole("link", { name: "Return to sign-in" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/callback$/);
});
test("mocked PKCE exchange restores a session after refresh and supports sign-out", async ({
  page,
}) => {
  const user = {
    id: "2d6e5aa1-e202-4aa7-b65e-125710626863",
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@example.com",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-11-01T00:00:00Z",
  };
  const encode = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const token =
    encode({ alg: "HS256", typ: "JWT" }) +
    "." +
    encode({
      sub: user.id,
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }) +
    ".fictional-signature";
  await page.route("**/api/config", (r) =>
    r.fulfill({
      json: {
        auth: { configured: true, message: "Mock service" },
        publicAuth: {
          url: "http://127.0.0.1:3000/test-auth",
          anonKey: "fictional-public-key",
        },
        providers: {},
        ai: { enabled: false },
      },
    }),
  );
  await page.route("**/api/connections", (r) =>
    r.fulfill({ json: { accounts: [] } }),
  );
  await page.route("**/test-auth/auth/v1/**", async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname.endsWith("/otp")) return r.fulfill({ json: {} });
    if (url.pathname.endsWith("/token")) {
      expect(r.request().postDataJSON().auth_code).toBe("fictional-code");
      return r.fulfill({
        json: {
          access_token: token,
          refresh_token: "fictional-refresh-token",
          expires_in: 3600,
          token_type: "bearer",
          user,
        },
      });
    }
    if (url.pathname.endsWith("/logout")) return r.fulfill({ status: 204 });
    return r.fulfill({ json: user });
  });
  await page.goto("/");
  await expect(page.locator(".shell")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Connect an email account" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(user.email);
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Sign-in link requested",
  );
  await page.goto("/auth/callback?code=fictional-code");
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  await expect(page.getByText("Signed in securely")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Signed in securely")).toBeVisible();
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Not signed in", { exact: true })).toBeVisible();
});
