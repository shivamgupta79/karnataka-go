import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ── Environment flags ─────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_READY =
  typeof SUPABASE_URL === "string" && SUPABASE_URL.startsWith("https://") &&
  typeof SUPABASE_KEY === "string" && SUPABASE_KEY.length > 10;

// ── Security headers added to every response ─────────────────────────────────
function applySecurityHeaders(res: NextResponse): NextResponse {
  const h = res.headers;

  // Prevent browsers rendering the page in a frame (clickjacking)
  h.set("X-Frame-Options", "DENY");

  // Stop MIME-type sniffing
  h.set("X-Content-Type-Options", "nosniff");

  // Only send origin in referrer, never full URL
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable browser features not needed by the app
  h.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), bluetooth=()"
  );

  // Force HTTPS for 1 year (only effective in production over HTTPS)
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // Content-Security-Policy
  // - default-src self
  // - scripts: self + Next.js inline (unsafe-inline needed for Next.js hydration)
  // - styles: self + unsafe-inline (Tailwind injects styles)
  // - images: self + data URIs + Supabase storage + map tiles
  // - connect: self + Supabase + Portkey + Anthropic + map tile servers
  // - frame-ancestors: none (reinforces X-Frame-Options)
  const supabaseHost = SUPABASE_URL ? new URL(SUPABASE_URL).host : "*.supabase.co";
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // unsafe-eval needed by Next.js dev; tighten in prod
    "style-src 'self' 'unsafe-inline'",
    // MapLibre GL loads sprites/glyphs as images and workers as blobs
    `img-src 'self' data: blob: https://${supabaseHost} https://tiles.openfreemap.org https://*.openfreemap.org`,
    "font-src 'self' data:",
    // MapLibre fetches tile JSON, vector tiles, glyphs and sprites
    // OpenFreeMap uses tiles.openfreemap.org + tile CDN subdomains
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.portkey.ai https://api.anthropic.com https://tiles.openfreemap.org https://*.openfreemap.org`,
    "worker-src 'self' blob:",     // MapLibre GL spawns a web worker from a blob URL
    "media-src 'self' blob:",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  h.set("Content-Security-Policy", csp);

  // Remove server fingerprint headers added by Next.js/Node
  h.delete("X-Powered-By");
  h.delete("Server");

  return res;
}

// ── Admin route protection ────────────────────────────────────────────────────
// /admin page  → must supply x-admin-secret cookie OR redirect to /admin#login
// /api/admin/* → must supply x-admin-secret header, else 403
function isAdminRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  return pathname === "/admin" || pathname.startsWith("/api/admin/");
}

function adminAuthorised(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false; // admin disabled when secret not set

  // API routes: check header
  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    return request.headers.get("x-admin-secret") === secret;
  }

  // Admin page: check cookie (set by the login form via JS)
  const cookieSecret = request.cookies.get("admin_secret")?.value;
  return cookieSecret === secret;
}

// ── Main middleware ────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Admin route guard ──────────────────────────────────────────────────
  if (isAdminRequest(request)) {
    if (!adminAuthorised(request)) {
      if (pathname.startsWith("/api/admin/")) {
        const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
        return applySecurityHeaders(res);
      }
      // Let the /admin page load — the client-side login form handles auth
      // (it sets the cookie after a successful /api/admin/stats check)
    }
  }

  // ── 2. Supabase session refresh ───────────────────────────────────────────
  if (!SUPABASE_READY) {
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();

  return applySecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
