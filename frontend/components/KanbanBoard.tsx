"use client";
import { useEffect, useState } from "react";

const COLUMNS = [
  { key: "ROUTED",          label: "Routed",          color: "bg-blue-100 border-blue-300" },
  { key: "IN_PROGRESS",     label: "In Progress",     color: "bg-yellow-100 border-yellow-300" },
  { key: "NEEDS_MORE_INFO", label: "Needs More Info", color: "bg-orange-100 border-orange-300" },
  { key: "RESOLVED",        label: "Resolved",        color: "bg-green-100 border-green-300" },
];

const SEVERITY_COLORS: Record<string, string> = {
  LOW:      "bg-gray-200 text-gray-700",
  MEDIUM:   "bg-yellow-200 text-yellow-800",
  HIGH:     "bg-orange-200 text-orange-800",
  CRITICAL: "bg-red-200 text-red-800",
};

export default function KanbanBoard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agency/tickets")
      .then((r) => r.json())
      .then((data) => {
        setTickets(Array.isArray(data) ? data : data.tickets ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const moveTicket = async (ticketId: string, newStatus: string) => {
    await fetch(`/api/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">Loading tickets...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Agency Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTickets = tickets.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className={`rounded-xl border-2 ${col.color} p-4 min-h-[400px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-700">{col.label}</h2>
                <span className="bg-white rounded-full px-2 py-0.5 text-sm font-bold text-gray-600">
                  {colTickets.length}
                </span>
              </div>

              {/* Ticket Cards */}
              <div className="space-y-3">
                {colTickets.length === 0 && (
                  <p className="text-sm text-gray-400 text-center mt-8">
                    No tickets
                  </p>
                )}
                {colTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-white rounded-lg shadow p-3 border border-gray-100"
                  >
                    {/* Title */}
                    <p className="font-medium text-gray-800 text-sm mb-2">
                      {ticket.title}
                    </p>

                    {/* Severity + Category */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          SEVERITY_COLORS[ticket.severity] ?? "bg-gray-100"
                        }`}
                      >
                        {ticket.severity}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {ticket.category?.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Flags */}
                    <div className="flex gap-1 mb-2">
                      {ticket.safety_flag && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                          🚨 Safety
                        </span>
                      )}
                      {ticket.accessibility_flag && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                          ♿ Access
                        </span>
                      )}
                      {ticket.emergency_flag && (
                        <span className="text-xs bg-red-200 text-red-700 px-1.5 py-0.5 rounded font-bold">
                          ⚠️ Emergency
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    {ticket.location_text && (
                      <p className="text-xs text-gray-400 mb-2">
                        📍 {ticket.location_text}
                      </p>
                    )}

                    {/* Photo */}
                    {ticket.image_url && (
                      <img
                        src={ticket.image_url}
                        alt="ticket"
                        className="w-full h-20 object-cover rounded mb-2"
                      />
                    )}

                    {/* Move Buttons */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                        <button
                          key={c.key}
                          onClick={() => moveTicket(ticket.id, c.key)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
