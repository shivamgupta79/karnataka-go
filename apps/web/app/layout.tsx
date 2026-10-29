import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import UserMenu from "@/components/UserMenu";
import SOSButton from "@/components/SOSButton";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "KarnatakaGo — AI travel planner for Karnataka",
  description: "Budget-aware, safety-aware itineraries for Karnataka. Save, share and explore.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">

        {/* ── Header ── */}
        <header style={{ background: "var(--color-forest)" }}>
          <nav className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3 text-sm">
            {/* Brand */}
            <Link href="/"
              className="text-lg font-extrabold tracking-tight flex items-center gap-1.5 mr-auto"
              style={{ color: "var(--color-saffron-2)" }}>
              🌿 KarnatakaGo
            </Link>

            {/* Nav links */}
            <Link href="/"        className="text-white/75 hover:text-white transition-colors hidden sm:block">Plan</Link>
            <Link href="/stay"    className="text-white/75 hover:text-white transition-colors hidden sm:block">Stay</Link>
            <Link href="/food"    className="text-white/75 hover:text-white transition-colors hidden sm:block">Food</Link>
            <Link href="/my-trips" className="text-white/75 hover:text-white transition-colors hidden sm:block">My Trips</Link>
            {process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://") && (
              <Link href="/social" className="text-white/75 hover:text-white transition-colors hidden sm:block">Social</Link>
            )}
            {process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://") && (
              <Link href="/profile" className="text-white/75 hover:text-white transition-colors hidden sm:block">Profile</Link>
            )}

            {/* User menu */}
            <UserMenu />
          </nav>
        </header>

        {/* ── Page content ── */}
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

        {/* ── Footer ── */}
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs opacity-55"
          style={{ borderTop: "1px solid var(--color-temple-2)", marginTop: "2rem", paddingTop: "1.5rem" }}>
          Prices are estimates only. Safety information is advisory — never a guarantee.{" "}
          Emergency: <strong>112</strong> · Women helpline: <strong>1091</strong> · Tourist helpline: <strong>1800-425-0087</strong>
        </footer>

        {/* ── Floating SOS ── */}
        <SOSButton />

      </body>
    </html>
  );
}
