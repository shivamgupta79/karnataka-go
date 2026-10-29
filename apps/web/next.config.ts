import type { NextConfig } from "next";

// ── Validate that no server-only secrets are accidentally exposed ─────────────
// This runs at build time and dev startup — it will throw if a secret key is
// accidentally assigned to a NEXT_PUBLIC_ variable (which would leak it to the
// browser bundle).
const SERVER_ONLY_KEYS = ["SUPABASE_SERVICE_ROLE_KEY", "ADMIN_SECRET"] as const;
for (const key of SERVER_ONLY_KEYS) {
  const publicVersion = `NEXT_PUBLIC_${key}`;
  if (process.env[publicVersion]) {
    throw new Error(
      `[security] "${publicVersion}" must NOT be set — it would expose "${key}" to the browser. ` +
      `Remove it from .env.local immediately.`
    );
  }
}

const config: NextConfig = {
  reactStrictMode: true,

  // Remove the X-Powered-By header (also done in middleware, belt-and-suspenders)
  poweredByHeader: false,

  // ── Render / PaaS deployment ─────────────────────────────────────────────
  // "standalone" bundles only the files needed to run the app, reducing the
  // deployed image size significantly. Render's Node runtime picks this up
  // automatically via the .next/standalone/server.js entrypoint.
  // PORT is injected by Render at runtime; `next start -p ${PORT:-3000}` in
  // package.json reads it before this config is evaluated.
  output: "standalone",

  // Fix "multiple lockfiles" warning: tell Next.js the monorepo root so it
  // can correctly trace files from the root node_modules if present.
  outputFileTracingRoot: require("path").resolve(__dirname, "../../"),

  // Prevent server-side env vars leaking into the client bundle.
  // Only variables explicitly listed under `env` or prefixed NEXT_PUBLIC_ are
  // exposed to the browser. Everything else stays server-only.
  // (This is Next.js default behaviour — listed here as explicit documentation.)

  // Content-Security-Policy and other security headers are applied in
  // middleware.ts so they are applied to ALL responses including API routes.
  // The headers() array below applies only to page/static responses as a
  // belt-and-suspenders fallback.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
          { key: "Strict-Transport-Security",  value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default config;
