"use client";

import { useEffect, useState } from "react";
import { fetchJsonWithFallback } from "@/lib/api";

interface PublicTicket {
  id: string;
  ticket_number: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  assigned_agency_name: string;
  public_summary: string;
  created_at: string;
}

export default function PublicIssuesPage() {
  const [tickets, setTickets] = useState<PublicTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJsonWithFallback<PublicTicket[]>("/api/tickets/public")
      .then((data) => setTickets(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ margin: 0, marginBottom: 8 }}>Public Issues</h1>
      <p style={{ marginTop: 0, color: "#64748b" }}>
        Sanitized civic issue feed visible to the public.
      </p>

      {loading && <p style={{ color: "#94a3b8" }}>Loading public issues…</p>}
      {error && <p style={{ color: "#b91c1c" }}>Failed to load issues: {error}</p>}
      {!loading && !error && tickets.length === 0 && (
        <p style={{ color: "#94a3b8" }}>No public issues available yet.</p>
      )}

      {!loading && !error && tickets.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {tickets.map((ticket) => (
            <article
              key={ticket.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "14px 16px",
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{ticket.ticket_number}</div>
                  <h3 style={{ margin: "4px 0 6px", fontSize: 16 }}>{ticket.title}</h3>
                </div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  {new Date(ticket.created_at).toLocaleString()}
                </div>
              </div>
              <p style={{ margin: "0 0 8px", color: "#334155" }}>{ticket.public_summary}</p>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b" }}>
                <span>{ticket.category}</span>
                <span>{ticket.severity}</span>
                <span>{ticket.status}</span>
                <span>{ticket.assigned_agency_name}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
