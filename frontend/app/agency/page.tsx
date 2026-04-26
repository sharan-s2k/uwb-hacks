"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJsonWithFallback } from "@/lib/api";

interface Agency {
  id: string;
  name: string;
  agency_type: string;
  description: string;
}

const TYPE_ICON: Record<string, string> = {
  PUBLIC_WORKS: "🏗",
  POLICE: "🚔",
  FIRE: "🚒",
  HEALTH: "🏥",
  PARKS: "🌳",
  UTILITIES: "⚡",
  SANITATION: "🗑",
  TRANSPORTATION: "🚌",
  UNASSIGNED: "🏛",
};

export default function AgencyListPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchJsonWithFallback<Agency[]>("/api/agencies")
      .then((data) => setAgencies(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleClick(agency: Agency) {
    router.push(`/dashboard/agency/${encodeURIComponent(agency.name)}`);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: 0 }}>
          City Departments
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>
          Select a department to view and manage its issue queue.
        </p>
      </div>

      {loading && (
        <div style={styles.center}>
          <p style={{ color: "#94a3b8" }}>Loading departments…</p>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>Failed to load departments: {error}</div>
      )}

      {!loading && !error && agencies.length === 0 && (
        <div style={styles.center}>
          <p style={{ color: "#94a3b8" }}>No departments found. Run the seed script to populate agencies.</p>
        </div>
      )}

      {!loading && !error && agencies.length > 0 && (
        <div style={styles.grid}>
          {agencies.map((agency) => (
            <button
              key={agency.id}
              style={styles.tile}
              onClick={() => handleClick(agency)}
            >
              <div style={styles.icon}>
                {TYPE_ICON[agency.agency_type] ?? "🏛"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 12 }}>
                {agency.name}
              </div>
              {agency.description && (
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, lineHeight: 1.4 }}>
                  {agency.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "28px 20px",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "box-shadow 0.15s, border-color 0.15s",
  },
  icon: {
    fontSize: 36,
    width: 64,
    height: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
    borderRadius: 16,
  },
  center: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "48px 32px",
    textAlign: "center",
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
