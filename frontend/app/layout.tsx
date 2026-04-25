import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CivicFix",
  description: "Report and track local civic issues",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
        <nav style={{
          background: "#1a56db",
          color: "#fff",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}>
          <Link href="/" style={{ color: "#fff", fontWeight: 700, fontSize: 18, textDecoration: "none" }}>
            CivicFix
          </Link>
          <Link href="/report" style={{ color: "#cbd5e1", fontSize: 14, textDecoration: "none" }}>
            Report Issue
          </Link>
          <Link href="/issues" style={{ color: "#cbd5e1", fontSize: 14, textDecoration: "none" }}>
            Public Board
          </Link>
          <div style={{ marginLeft: "auto", fontSize: 14 }}>
            {/* Auth0 login/logout will go here */}
            <span style={{ color: "#cbd5e1" }}>Sign In</span>
          </div>
        </nav>
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
