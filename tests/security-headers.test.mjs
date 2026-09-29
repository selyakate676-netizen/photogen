import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "production";
const { default: nextConfig } = await import("../next.config.ts?security-headers");

test("production responses receive the required security headers", async () => {
  const rules = await nextConfig.headers();
  assert.equal(rules.length, 1);
  assert.equal(rules[0].source, "/:path*");

  const headers = Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]));
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(
    headers["Permissions-Policy"],
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  assert.ok(headers["Content-Security-Policy"]);
});

test("CSP denies framing and allows only required external services", async () => {
  const rules = await nextConfig.headers();
  const csp = rules[0].headers.find(({ key }) => key === "Content-Security-Policy")?.value ?? "";

  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /https://*.supabase.co/);
  assert.match(csp, /wss://*.supabase.co/);
  assert.match(csp, /https://*.storage.beget.cloud/);
  assert.match(csp, /https://mc.yandex.ru/);
  assert.match(csp, /https://yastatic.net/);
  assert.match(csp, /https://fonts.googleapis.com/);
  assert.doesNotMatch(csp, /frame-ancestors[^;]**/);
});