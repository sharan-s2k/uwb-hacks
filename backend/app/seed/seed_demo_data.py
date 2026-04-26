"use client";
import { useEffect, useState } from "react";

const COLUMNS = [
  { key: "ROUTED",          label: "🟦 Routed",          bg: "bg-blue-50",   border: "border-blue-300",   count: "bg-blue-500" },
  { key: "IN_PROGRESS",     label: "🟨 In Progress",     bg: "bg-yellow-50", border: "border-yellow-300", count: "bg-yellow-500" },
  { key: "NEEDS_MORE_INFO", label: "🟧 Needs More Info", bg: "bg-orange-50", border: "border-orange-300", count: "bg-orange-500" },
  { key: "RESOLVED",        label: "🟩 Resolved",        bg: "bg-green-50",  border: "border-green-300",  count: "bg-green-500" },
];

const SEVERITY: Record<string, string> = {
  LOW:      "bg-gray-100 text-gray-600",
  MEDIUM:   "bg-yellow-100 text-yellow-700",
  HIGH:     "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700 font-bold",
};

// Mock data for when API is not available
const MOCK_TICKETS = [
  { id: "1", title: "Large pothole on Main Street", category: "POTHOLE", severity: "MEDIUM", status: "ROUTED", location_text: "Main St & 4th Ave", safety_flag: false, accessibility_flag: false, emergency_flag: false },
  { id: "2", title: "Pothole on Oak Avenue", category: "POTHOLE", severity: "HIGH", status: "IN_PROGRESS", location_text: "Oak Ave near school", safety_flag: true, accessibility_flag: false, emergency_flag: false },
  { id: "3", title: "Broken sidewalk on 5th Street", category: "SIDEWALK_OBSTRUCTION", severity: "MEDIUM", status: "NEEDS_MORE_INFO", location_text: "5th Street", safety_flag: false, accessibility_flag: true, emergency_flag: false },
  { id: "4", title: "Streetlight out near community center", category: "STREETLIGHT_OUTAGE", severity: "HIGH", status: "ROUTED", location_text: "Community Center", safety_flag: true, accessibility_flag: false, emergency_flag: false },
  { id: "5", title: "Multiple streetlights out on Elm St", category: "STREETLIGHT_OUTAGE", severity: "HIGH", status: "IN_PROGRESS", location_text: "Elm St 2nd-4th Ave", safety_flag: true, accessibility_flag: false, emergency_flag: false },
  { id: "6", title: "Streetlight flickering on Park Blvd", category: "STREETLIGHT_OUTAGE", severity: "LOW", status: "RESOLVED", location_text: "Park Blvd", safety_flag: false, accessibility_flag: false, emergency_flag: false },
  { id: "7", title: "Flooding on Riverside Drive", category: "FLOODING", severity: "HIGH", status: "ROUTED", location_text: "Riverside Drive", safety_flag: true, accessibility_flag: false, emergency_flag: false },
  { id: "8", title: "Water leak on Oak Street", category: "WATER_LEAK", severity: "CRITICAL", status: "IN_PROGRESS", location_text: "Oak St & 3rd", safety_flag: true, accessibility_flag: false, emergency_flag: true },
  { id: "9", title: "Park equipment damaged", category: "PARK_DAMAGE", severity: "HIGH", status: "ROUTED", location_text: "Central Park", safety_flag: true, accessibility_flag: false, emergency_flag: false },
  { id: "10", title: "Graffiti on underpass wall", category: "GRAFFITI", severity: "LOW", status: "ROUTED", location_text: "Underpass on 1st", safety_flag: false, accessibility_flag: false, emergency_flag: false },
  { id: "11", title: "Abandoned vehicle on 2nd Ave", category: "ABANDONED_VEHICLE", severity: "LOW", status: "RESOLVED", location_text: "2nd Ave", safety_flag: false, accessibility_flag: false, emergency_flag: false },
  { id: "12", title: "Illegal dumping behind plaza", category: "ILLEGAL_DUMPING", severity: "MEDIUM", status: "ROUTED", location_text: "Behind shopping plaza", safety_flag: false, accessibility_flag: false, emergency_flag: false },
];

export default function KanbanBoard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/agency/tickets")
      .then((r) => {
        if (!r.ok) throw new Error("API not ready");
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.tickets ?? [];
        if (list.length === 0) {
          setTickets(MOCK_TICKETS);
          setUsingMock(true);
        } else {
          setTickets(list);
        }
        setLoading(false);
      })
      .catch(() => {
        setTickets(MOCK_TICKETS);
        setUsingMock(true);
        setLoading(false);
      });
  }, []);

  const moveTicket = async (ticketId: string, newStatus: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
    if (!usingMock) {
      await fetch(`/api/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    }
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev: any) => ({ ...prev, status: newStatus }));
    }
  };

  const totalTickets = tickets.length;
  const criticalCount = tickets.filter((t) => t.severity === "CRITICAL").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;
  const safetyCount = tickets.filter((t) => t.safety_flag).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <p className="text-gray-500">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Agency Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage and track civic issue tickets</p>
        {usingMock && (
          <div className="mt-2 inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
            ⚠️ Showing demo data — connect backend to see live tickets
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Total Tickets</p>
          <p className="text-3xl font-bold text-gray-800">{totalTickets}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Critical</p>
          <p className="text-3xl font-bold text-red-500">{criticalCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Resolved</p>
          <p className="text-3xl font-bold text-green-500">{resolvedCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Safety Flags</p>
          <p className="text-3xl font-bold text-orange-500">{safetyCount}</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTickets = tickets.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`rounded-xl border-2 ${col.bg} ${col.border} p-4 min-h-96`}>

              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-700 text-sm">{col.label}</h2>
                <span className={`${col.count} text-white rounded-full px-2 py-0.5 text-xs font-bold`}>
                  {colTickets.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {colTickets.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-8">No tickets</p>
                )}
                {colTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="bg-white rounded-lg shadow-sm p-3 border border-gray-100 cursor-pointer hover:shadow-md transition"
                  >
                    {/* Emergency Banner */}
                    {ticket.emergency_flag && (
                      <div className="bg-red-500 text-white text-xs px-2 py-1 rounded mb-2 font-bold">
                        ⚠️ EMERGENCY
                      </div>
                    )}

                    {/* Title */}
                    <p className="font-medium text-gray-800 text-sm mb-2 leading-tight">
                      {ticket.title}
                    </p>

                    {/* Severity + Category */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY[ticket.severity] ?? "bg-gray-100"}`}>
                        {ticket.severity}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {ticket.category?.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Flags */}
                    <div className="flex gap-1 mb-2 flex-wrap">
                      {ticket.safety_flag && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">🚨 Safety</span>
                      )}
                      {ticket.accessibility_flag && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">♿ Access</span>
                      )}
                    </div>

                    {/* Location */}
                    {ticket.location_text && (
                      <p className="text-xs text-gray-400 mb-2">📍 {ticket.location_text}</p>
                    )}

                    {/* Move Buttons */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                        <button
                          key={c.key}
                          onClick={(e) => { e.stopPropagation(); moveTicket(ticket.id, c.key); }}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition"
                        >
                          → {c.label.split(" ")[1]}
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

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-screen overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800 pr-4">{selectedTicket.title}</h2>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              <span className={`text-sm px-3 py-1 rounded-full ${SEVERITY[selectedTicket.severity]}`}>
                {selectedTicket.severity}
              </span>
              <span className="text-sm px-3 py-1 rounded-full bg-purple-100 text-purple-700">
                {selectedTicket.category?.replace(/_/g, " ")}
              </span>
              <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                {selectedTicket.status?.replace(/_/g, " ")}
              </span>
            </div>

            {selectedTicket.location_text && (
              <p className="text-sm text-gray-600 mb-3">📍 {selectedTicket.location_text}</p>
            )}

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1 font-semibold">DESCRIPTION</p>
              <p className="text-sm text-gray-700">{selectedTicket.original_description || selectedTicket.agency_summary || "No description available"}</p>
            </div>

            {selectedTicket.suggested_action && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-500 mb-1 font-semibold">SUGGESTED ACTION</p>
                <p className="text-sm text-blue-700">{selectedTicket.suggested_action}</p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap mb-4">
              {selectedTicket.safety_flag && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">🚨 Safety Flag</span>}
              {selectedTicket.accessibility_flag && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">♿ Accessibility</span>}
              {selectedTicket.emergency_flag && <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded font-bold">⚠️ Emergency</span>}
            </div>

            {/* Add Note */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1 font-semibold">ADD NOTE</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add an agency note..."
                className="w-full border rounded-lg p-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Move Ticket */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-semibold">MOVE TO</p>
              <div className="flex gap-2 flex-wrap">
                {COLUMNS.filter((c) => c.key !== selectedTicket.status).map((c) => (
                  <button
                    key={c.key}
                    onClick={() => moveTicket(selectedTicket.id, c.key)}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition font-medium"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
