"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TicketResponse } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  ROUTED:           { bg: "#dbeafe", color: "#1d4ed8" },
  IN_PROGRESS:      { bg: "#fef9c3", color: "#854d0e" },
  NEEDS_MORE_INFO:  { bg: "#fce7f3", color: "#9d174d" },
  RESOLVED:         { bg: "#dcfce7", color: "#15803d" },
};

const SEVERITY_COLOR: Record<string, { bg: string; color: string }> = {
  LOW:      { bg: "#f1f5f9", color: "#475569" },
  MEDIUM:   { bg: "#fef9c3", color: "#854d0e" },
  HIGH:     { bg: "#ffedd5", color: "#c2410c" },
  CRITICAL: { bg: "#fee2e2", color: "#b91c1c" },
};

export default function CitizenDashboardPage() {
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/tickets/my`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((data) => setTickets(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>My Issues</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
            All civic issues you have reported
          </p>
        </div>
        <Link
          href="/report"
          style={{
            background: "#1a56db",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + Report New Issue
        </Link>
      </div>

      {loading && (
        <div style={styles.emptyBox}>
          <p style={{ color: "#94a3b8" }}>Loading your issues…</p>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          Failed to load tickets: {error}
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div style={styles.emptyBox}>
          <p style={{ color: "#94a3b8", marginBottom: 12 }}>You haven't reported any issues yet.</p>
          <Link href="/report" style={{ color: "#1a56db", fontSize: 14 }}>
            Report your first issue →
          </Link>
        </div>
      )}

      {tickets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: TicketResponse }) {
  const status = STATUS_COLOR[ticket.status] ?? { bg: "#f1f5f9", color: "#475569" };
  const severity = SEVERITY_COLOR[ticket.severity] ?? { bg: "#f1f5f9", color: "#475569" };

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
              {ticket.ticket_number}
            </span>
            {ticket.emergency_flag && (
              <span style={{ fontSize: 11, background: "#fee2e2", color: "#b91c1c", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                ⚠️ EMERGENCY
              </span>
            )}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: 0 }}>
            {ticket.title}
          </h3>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4, lineHeight: 1.5 }}>
            {ticket.citizen_summary}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, ...status }}>
            {ticket.status.replace(/_/g, " ")}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, ...severity }}>
            {ticket.severity}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9", display: "flex", gap: 16, fontSize: 12, color: "#94a3b8" }}>
        <span>📂 {ticket.category.replace(/_/g, " ")}</span>
        <span>🏛 {ticket.assigned_agency_name}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    borderRadius: 10,
    padding: "16px 20px",
    boxShadow: "0 1px 4px rgba(0,0,0,.06)",
    border: "1px solid #e2e8f0",
  },
  emptyBox: {
    background: "#fff",
    borderRadius: 10,
    padding: "48px 32px",
    textAlign: "center",
    border: "1px solid #e2e8f0",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    padding: "12px 16px",
    color: "#b91c1c",
    fontSize: 14,
  },
};
