import Link from "next/link";

export default function Home() {
  return (
    <div style={{ textAlign: "center", paddingTop: 64 }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, color: "#1a56db" }}>CivicFix</h1>
      <p style={{ fontSize: 18, color: "#475569", marginTop: 12 }}>
        Report local issues. Track their resolution.
      </p>
      <div style={{ marginTop: 32, display: "flex", gap: 16, justifyContent: "center" }}>
        <Link
          href="/report"
          style={{
            background: "#1a56db",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Report an Issue
        </Link>
        <Link
          href="/agency"
          style={{
            background: "#fff",
            color: "#1a56db",
            padding: "12px 28px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            border: "1px solid #1a56db",
          }}
        >
          Manage &amp; Resolve Issues
        </Link>
      </div>
    </div>
  );
}
