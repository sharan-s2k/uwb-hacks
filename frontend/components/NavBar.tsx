"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();
  const isAgencyView = pathname.startsWith("/dashboard/agency");
  const isHome = pathname === "/" || pathname === "/agency";

  return (
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

      {!isHome && !isAgencyView && (
        <>
          <Link href="/report" style={{ color: "#cbd5e1", fontSize: 14, textDecoration: "none" }}>
            Report Issue
          </Link>
          <Link href="/dashboard/citizen" style={{ color: "#cbd5e1", fontSize: 14, textDecoration: "none" }}>
            My Issues
          </Link>
          <Link href="/issues" style={{ color: "#cbd5e1", fontSize: 14, textDecoration: "none" }}>
            Public Board
          </Link>
        </>
      )}

      {isAgencyView && (
        <Link href="/agency" style={{ color: "#cbd5e1", fontSize: 14, textDecoration: "none" }}>
          Departments
        </Link>
      )}

      <div style={{ marginLeft: "auto", fontSize: 14 }}>
        <span style={{ color: "#cbd5e1" }}>Sign In</span>
      </div>
    </nav>
  );
}
