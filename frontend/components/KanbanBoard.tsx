"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchJsonWithFallback, patchJsonWithFallback } from "@/lib/api";
import AgencyAssistant, { AssistantAction } from "./AgencyAssistant";

interface AgencyOption { id: string; name: string; agency_type: string; }

const NON_FORWARDABLE_STATUS = "RESOLVED";

const COLS = [
  { key:"ROUTED",          label:"Routed",      bg:"#EEF5FC", border:"#C8DEFA", dot:"#378ADD", countBg:"#B5D4F4", countColor:"#0C447C" },
  { key:"IN_PROGRESS",     label:"In Progress", bg:"#FDF6EC", border:"#FAD99B", dot:"#BA7517", countBg:"#FAC775", countColor:"#633806" },
  { key:"NEEDS_MORE_INFO", label:"Needs Info",  bg:"#FDF0EC", border:"#F5C4B3", dot:"#D85A30", countBg:"#F5C4B3", countColor:"#712B13" },
  { key:"RESOLVED",        label:"Resolved",    bg:"#EEF7E6", border:"#C0DD97", dot:"#3B6D11", countBg:"#C0DD97", countColor:"#27500A" },
];

const SEV: Record<string, { bg: string; color: string }> = {
  LOW:      { bg:"#F1EFE8", color:"#5F5E5A" },
  MEDIUM:   { bg:"#FAEEDA", color:"#854F0B" },
  HIGH:     { bg:"#FAECE7", color:"#993C1D" },
  CRITICAL: { bg:"#FCEBEB", color:"#A32D2D" },
};

const MOCK = [
  { id:"1",  title:"Large pothole on Main Street",          category:"Pothole",           severity:"MEDIUM",   status:"ROUTED",          location_text:"Main St & 4th Ave",     safety_flag:false, accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0001" },
  { id:"2",  title:"Pothole on Oak Avenue",                 category:"Pothole",           severity:"HIGH",     status:"IN_PROGRESS",     location_text:"Oak Ave near school",   safety_flag:true,  accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0002" },
  { id:"3",  title:"Broken sidewalk on 5th Street",         category:"Sidewalk",          severity:"MEDIUM",   status:"NEEDS_MORE_INFO", location_text:"5th Street",            safety_flag:false, accessibility_flag:true,  emergency_flag:false, ticket_number:"CFX-0003" },
  { id:"4",  title:"Streetlight out near community center", category:"Streetlight",       severity:"HIGH",     status:"ROUTED",          location_text:"Community Center",      safety_flag:true,  accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0004" },
  { id:"5",  title:"Multiple streetlights out on Elm St",   category:"Streetlight",       severity:"HIGH",     status:"IN_PROGRESS",     location_text:"Elm St 2nd–4th Ave",    safety_flag:true,  accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0005" },
  { id:"6",  title:"Streetlight flickering on Park Blvd",   category:"Streetlight",       severity:"LOW",      status:"RESOLVED",        location_text:"Park Blvd",             safety_flag:false, accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0006" },
  { id:"7",  title:"Flooding on Riverside Drive",           category:"Flooding",          severity:"HIGH",     status:"ROUTED",          location_text:"Riverside Drive",       safety_flag:true,  accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0007" },
  { id:"8",  title:"Water leak on Oak Street",              category:"Water Leak",        severity:"CRITICAL", status:"IN_PROGRESS",     location_text:"Oak St & 3rd",          safety_flag:true,  accessibility_flag:false, emergency_flag:true,  ticket_number:"CFX-0008" },
  { id:"9",  title:"Park equipment damaged",                category:"Park Damage",       severity:"HIGH",     status:"ROUTED",          location_text:"Central Park",          safety_flag:true,  accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0009" },
  { id:"10", title:"Graffiti on underpass wall",            category:"Graffiti",          severity:"LOW",      status:"ROUTED",          location_text:"Underpass on 1st",      safety_flag:false, accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0010" },
  { id:"11", title:"Abandoned vehicle on 2nd Ave",          category:"Abandoned Vehicle", severity:"LOW",      status:"RESOLVED",        location_text:"2nd Ave",               safety_flag:false, accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0011" },
  { id:"12", title:"Illegal dumping behind plaza",          category:"Illegal Dumping",   severity:"MEDIUM",   status:"ROUTED",          location_text:"Behind shopping plaza", safety_flag:false, accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0012" },
];

interface KanbanBoardProps { agencyName?: string; }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function resolveImageUrl(imageUrl?: string): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  if (!imageUrl.startsWith("/")) return imageUrl;
  if (API_URL) return `${API_URL}${imageUrl}`;
  if (typeof window === "undefined") return imageUrl;
  if (window.location.hostname === "localhost" && window.location.port === "3000") return `http://localhost:8000${imageUrl}`;
  return imageUrl;
}

export default function KanbanBoard({ agencyName }: KanbanBoardProps) {
  const [tickets, setTickets]                   = useState<any[]>([]);
  const [selected, setSelected]                 = useState<any>(null);
  const [imageLoadError, setImageLoadError]     = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [usingMock, setUsingMock]               = useState(false);
  const [severityFilter, setSeverityFilter]     = useState("ALL");
  const [categoryFilter, setCategoryFilter]     = useState("ALL");
  const [showSafetyOnly, setShowSafetyOnly]     = useState(false);
  const [showAccessibilityOnly, setShowAccessibilityOnly] = useState(false);
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false);

  // ── Drag & drop + bulk selection ──────────────────────────────────────────
  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set());
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const draggingIds                   = useRef<string[]>([]);

  // ── Forward to department ─────────────────────────────────────────────────
  const [agencies, setAgencies]               = useState<AgencyOption[]>([]);
  const [forwardingAgency, setForwardingAgency] = useState("");

  // ── AI assistant sidebar ──────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const url = agencyName
      ? `/api/agency/tickets?agency_name=${encodeURIComponent(agencyName)}`
      : "/api/agency/tickets";
    fetchJsonWithFallback<any[]>(url)
      .then(list => { setTickets(list.length > 0 ? list : MOCK); setUsingMock(list.length === 0); setLoading(false); })
      .catch(() => { setTickets(MOCK); setUsingMock(true); setLoading(false); });

    fetchJsonWithFallback<AgencyOption[]>("/api/agencies")
      .then(setAgencies)
      .catch(() => {});
  }, [agencyName]);

  // Move one ticket (optimistic + API)
  const move = (id: string, status: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (selected?.id === id) setSelected((s: any) => ({ ...s, status }));
    if (!usingMock) patchJsonWithFallback(`/api/tickets/${id}/status`, { status });
  };

  // Move many tickets at once
  const moveMany = (ids: string[], status: string) => {
    setTickets(prev => prev.map(t => ids.includes(t.id) ? { ...t, status } : t));
    if (!usingMock) ids.forEach(id => patchJsonWithFallback(`/api/tickets/${id}/status`, { status }));
    setCheckedIds(new Set());
  };

  // Forward/reassign many tickets to a different department
  const forwardMany = (ids: string[], agency_name: string) => {
    setTickets(prev => prev.map(t => ids.includes(t.id) ? { ...t, assigned_agency_name: agency_name } : t));
    if (!usingMock) ids.forEach(id => patchJsonWithFallback(`/api/tickets/${id}/agency`, { agency_name }));
    setCheckedIds(new Set());
    setForwardingAgency("");
  };

  // Handle AI assistant actions
  const handleAssistantAction = (actions: AssistantAction[]) => {
    actions.forEach(a => {
      if (a.type === "move_status" && a.new_status) moveMany(a.ticket_ids, a.new_status);
      if (a.type === "forward_department" && a.department) forwardMany(a.ticket_ids, a.department);
    });
  };

  // Toggle checkbox
  const toggleCheck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── DnD handlers ─────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    // If the dragged card is checked, carry all checked cards; otherwise just this one
    const ids = checkedIds.has(ticketId) ? Array.from(checkedIds) : [ticketId];
    draggingIds.current = ids;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(ids));
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colKey);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column entirely (not a child element)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const ids = draggingIds.current;
    if (!ids.length) return;
    // Only move tickets that aren't already in this column
    const toMove = ids.filter(id => tickets.find(t => t.id === id)?.status !== colKey);
    if (toMove.length) moveMany(toMove, colKey);
    draggingIds.current = [];
  };

  const handleDragEnd = () => {
    setDragOverCol(null);
    draggingIds.current = [];
  };

  // Forward is enabled only when no RESOLVED ticket is in the selection
  const checkedTickets    = tickets.filter(t => checkedIds.has(t.id));
  const forwardEnabled    = checkedIds.size > 0 && checkedTickets.every(t => t.status !== NON_FORWARDABLE_STATUS);
  const forwardDisabledMsg = checkedIds.size > 0 && !forwardEnabled
    ? "Cannot forward — deselect resolved tickets first"
    : "";

  // ── Filtering ─────────────────────────────────────────────────────────────

  const categories = Array.from(new Set(tickets.map(t => t.category).filter(Boolean))).sort();

  const filtered = tickets.filter(t => {
    if (severityFilter !== "ALL" && t.severity !== severityFilter) return false;
    if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false;
    if (showSafetyOnly && !t.safety_flag) return false;
    if (showAccessibilityOnly && !t.accessibility_flag) return false;
    if (showEmergencyOnly && !t.emergency_flag) return false;
    return true;
  });

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, background:"#f5f6f8" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:32, height:32, border:"2px solid #185FA5", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }}/>
        <p style={{ color:"#888", fontSize:13 }}>Loading tickets...</p>
      </div>
    </div>
  );

  const stats = { total: tickets.length, critical: tickets.filter(t => t.severity==="CRITICAL").length, open: tickets.filter(t => t.status!=="RESOLVED").length, resolved: tickets.filter(t => t.status==="RESOLVED").length };

  const pill = (label: string, bg: string, color: string) => (
    <span style={{ fontSize:10, fontWeight:500, padding:"2px 7px", borderRadius:10, background:bg, color, letterSpacing:.2 }}>{label}</span>
  );

  const filterBtnStyle = (active: boolean) => ({
    fontSize:12, padding:"5px 12px", borderRadius:20, border:`0.5px solid ${active?"#85B7EB":"#ddd"}`,
    background: active ? "#E6F1FB" : "#fff", color: active ? "#0C447C" : "#888",
    cursor:"pointer", fontFamily:"inherit",
  });

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif", background:"#f5f6f8", minHeight:"100vh", padding:24 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .kb-card:hover{border-color:#bbb!important;transform:translateY(-1px)}
        .kb-card.dragging{opacity:0.45;transform:scale(0.97)}
        .kb-col-drop{border-color:#378ADD!important;background:#dbeafe!important;box-shadow:0 0 0 2px #378ADD40}
        .kb-move:hover{background:#fff!important;color:#333!important}
        .kb-move-lg:hover{background:#f0f0f0!important}
        .kb-checkbox{width:15px;height:15px;cursor:pointer;accent-color:#185FA5;flex-shrink:0}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, background:"#185FA5", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" fill="white" opacity=".9"/><rect x="10" y="2" width="6" height="6" rx="1.5" fill="white" opacity=".6"/><rect x="2" y="10" width="6" height="6" rx="1.5" fill="white" opacity=".6"/><rect x="10" y="10" width="6" height="6" rx="1.5" fill="white" opacity=".3"/></svg>
          </div>
          <div>
            {agencyName && <Link href="/agency" style={{ fontSize:12, color:"#888", textDecoration:"none" }}>← Departments</Link>}
            <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>{agencyName ?? "All Departments"}</div>
            <div style={{ fontSize:11, color:"#888" }}>Agency operations</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {usingMock && <span style={{ fontSize:11, background:"#FAEEDA", color:"#854F0B", padding:"3px 10px", borderRadius:20, border:"0.5px solid #FAC775" }}>Demo data</span>}
          {agencyName && (
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{
                fontSize:12, padding:"7px 14px", borderRadius:20,
                border: sidebarOpen ? "1px solid #1a56db" : "0.5px solid #ddd",
                background: sidebarOpen ? "#1a56db" : "#fff",
                color: sidebarOpen ? "#fff" : "#444",
                cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5, fontWeight:500,
              }}
            >
              🤖 AI Assistant
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
        {([["Total tickets", stats.total, "#1a1a1a", ""], ["Critical", stats.critical, "#A32D2D", "immediate action"], ["Open", stats.open, "#185FA5", "across all stages"], ["Resolved", stats.resolved, "#3B6D11", "this period"]] as const).map(([label, val, color, sub]) => (
          <div key={label} style={{ background:"#fff", border:"0.5px solid #e5e5e5", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:26, fontWeight:500, color }}>{val}</div>
            {sub && <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: checkedIds.size > 0 ? 8 : 16, flexWrap:"wrap" }}>
        <span style={{ fontSize:12, color:"#888", marginRight:4 }}>Filter:</span>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
          style={{ fontSize:12, padding:"6px 10px", borderRadius:8, border:"0.5px solid #ddd", background:"#fff", color:"#444", fontFamily:"inherit" }}>
          <option value="ALL">All severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ fontSize:12, padding:"6px 10px", borderRadius:8, border:"0.5px solid #ddd", background:"#fff", color:"#444", fontFamily:"inherit" }}>
          <option value="ALL">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button style={filterBtnStyle(showSafetyOnly)} onClick={() => setShowSafetyOnly(v => !v)}>Safety flags</button>
        <button style={filterBtnStyle(showAccessibilityOnly)} onClick={() => setShowAccessibilityOnly(v => !v)}>Accessibility</button>
        <button style={filterBtnStyle(showEmergencyOnly)} onClick={() => setShowEmergencyOnly(v => !v)}>Emergency</button>
        <div style={{ marginLeft:"auto", fontSize:11, color:"#aaa" }}>Showing {filtered.length} ticket{filtered.length!==1?"s":""}</div>
      </div>

      {/* Bulk action bar */}
      {checkedIds.size > 0 && (
        <div style={{ background:"#EBF2FB", border:"0.5px solid #85B7EB", borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
          {/* Row 1: selection count + move status buttons */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, fontWeight:600, color:"#0C447C" }}>
              {checkedIds.size} ticket{checkedIds.size > 1 ? "s" : ""} selected
            </span>
            <span style={{ fontSize:12, color:"#4B7BAD" }}>— Move all to:</span>
            {COLS.map(col => (
              <button key={col.key} onClick={() => moveMany(Array.from(checkedIds), col.key)}
                style={{ fontSize:11, padding:"4px 10px", border:`0.5px solid ${col.border}`, borderRadius:8, background:col.bg, color:col.countColor, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:col.dot, display:"inline-block" }}/>
                {col.label}
              </button>
            ))}
            <button onClick={() => setCheckedIds(new Set())}
              style={{ marginLeft:"auto", fontSize:11, padding:"4px 10px", border:"0.5px solid #ddd", borderRadius:8, background:"#fff", color:"#888", cursor:"pointer", fontFamily:"inherit" }}>
              Clear selection
            </button>
          </div>

          {/* Row 2: forward to department */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, paddingTop:10, borderTop:"0.5px solid #C8DEFA", flexWrap:"wrap" }}>
            <span style={{ fontSize:12, fontWeight:600, color: forwardEnabled ? "#0C447C" : "#9BB8D4" }}>
              🔀 Forward to department:
            </span>
            <div style={{ position:"relative", display:"flex", alignItems:"center", gap:6 }}>
              <select
                value={forwardingAgency}
                disabled={!forwardEnabled}
                title={forwardDisabledMsg}
                onChange={e => {
                  const name = e.target.value;
                  if (name) forwardMany(Array.from(checkedIds), name);
                }}
                style={{
                  fontSize:12, padding:"5px 28px 5px 10px",
                  borderRadius:8,
                  border: forwardEnabled ? "1px solid #378ADD" : "0.5px solid #C8DEFA",
                  background: forwardEnabled ? "#fff" : "#EBF2FB",
                  color: forwardEnabled ? "#0C447C" : "#9BB8D4",
                  cursor: forwardEnabled ? "pointer" : "not-allowed",
                  fontFamily:"inherit",
                  appearance:"none",
                  WebkitAppearance:"none",
                  minWidth:200,
                }}
              >
                <option value="">Select department…</option>
                {agencies.map(a => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
              <span style={{ pointerEvents:"none", position:"absolute", right:10, color: forwardEnabled ? "#378ADD" : "#9BB8D4", fontSize:11 }}>▼</span>
            </div>
            {forwardDisabledMsg && (
              <span style={{ fontSize:11, color:"#c04040", fontStyle:"italic" }}>
                ⚠ {forwardDisabledMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:10 }}>
        {COLS.map(col => {
          const items = filtered.filter(t => t.status === col.key);
          const isDropTarget = dragOverCol === col.key;
          return (
            <div
              key={col.key}
              className={isDropTarget ? "kb-col-drop" : ""}
              onDragOver={e => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.key)}
              style={{ background:col.bg, border:`0.5px solid ${col.border}`, borderRadius:12, padding:12, transition:"border-color .1s, background .1s, box-shadow .1s", minHeight:120 }}
            >
              {/* Column header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, paddingBottom:10, borderBottom:`0.5px solid ${col.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, fontWeight:500, color:"#1a1a1a" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:col.dot }}/>
                  {col.label}
                </div>
                <span style={{ fontSize:11, fontWeight:500, padding:"2px 8px", borderRadius:10, background:col.countBg, color:col.countColor }}>{items.length}</span>
              </div>

              {/* Cards */}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {items.length === 0 && (
                  <div style={{ textAlign:"center", padding:"28px 0", fontSize:12, color: isDropTarget ? "#378ADD" : "#bbb", border: isDropTarget ? "2px dashed #378ADD" : "2px dashed transparent", borderRadius:8, transition:"all .1s" }}>
                    {isDropTarget ? "Drop here" : "No tickets here"}
                  </div>
                )}
                {items.map(ticket => {
                  const isChecked = checkedIds.has(ticket.id);
                  const isBeingDragged = draggingIds.current.includes(ticket.id);
                  return (
                    <div
                      key={ticket.id}
                      draggable
                      onDragStart={e => handleDragStart(e, ticket.id)}
                      onDragEnd={handleDragEnd}
                      className={`kb-card${isBeingDragged ? " dragging" : ""}`}
                      onClick={() => { setSelected(ticket); setImageLoadError(false); }}
                      style={{
                        background: isChecked ? "#F0F7FF" : "#fff",
                        border: isChecked ? "1.5px solid #378ADD" : "0.5px solid #e8e8e8",
                        borderRadius:10, padding:12,
                        cursor:"grab",
                        transition:"border-color .15s, transform .1s, background .1s",
                        userSelect:"none",
                      }}
                    >
                      {/* Card top row: checkbox + ticket number */}
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                        <input
                          type="checkbox"
                          className="kb-checkbox"
                          checked={isChecked}
                          onClick={e => toggleCheck(e, ticket.id)}
                          onChange={() => {}}
                        />
                        <span style={{ fontSize:10, color:"#aaa", fontWeight:500, flex:1 }}>{ticket.ticket_number}</span>
                        {ticket.emergency_flag && (
                          <span style={{ fontSize:9, background:"#FCEBEB", color:"#791F1F", padding:"1px 5px", borderRadius:4, fontWeight:600, letterSpacing:.3 }}>EMERGENCY</span>
                        )}
                      </div>

                      <div style={{ fontSize:13, fontWeight:500, color:"#1a1a1a", lineHeight:1.4, marginBottom:8 }}>{ticket.title}</div>

                      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
                        {pill(ticket.severity, SEV[ticket.severity]?.bg, SEV[ticket.severity]?.color)}
                        {pill(ticket.category, "#f0f0f0", "#666")}
                      </div>
                      {ticket.safety_flag && <div style={{ marginBottom:5 }}>{pill("Safety flag", "#FCEBEB", "#791F1F")}</div>}
                      {ticket.accessibility_flag && <div style={{ marginBottom:5 }}>{pill("Accessibility", "#E6F1FB", "#0C447C")}</div>}
                      {ticket.assigned_agency_name && ticket.assigned_agency_name !== "Unassigned" && (
                        <div style={{ fontSize:11, color:"#4B7BAD", marginBottom:4, display:"flex", alignItems:"center", gap:4 }}>
                          🏛 {ticket.assigned_agency_name}
                        </div>
                      )}
                      {ticket.location_text && (
                        <div style={{ fontSize:11, color:"#999", marginBottom:8, display:"flex", alignItems:"center", gap:4 }}>
                          <svg width="9" height="12" viewBox="0 0 10 12" fill="none"><path d="M5 0C3.07 0 1.5 1.57 1.5 3.5c0 2.63 3.5 8.5 3.5 8.5s3.5-5.87 3.5-8.5C8.5 1.57 6.93 0 5 0zm0 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="#999"/></svg>
                          {ticket.location_text}
                        </div>
                      )}

                      {/* Quick-move buttons */}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4, paddingTop:8, borderTop:"0.5px solid #f0f0f0" }}>
                        {COLS.filter(c => c.key !== col.key).map(c => (
                          <button key={c.key} className="kb-move"
                            onClick={e => { e.stopPropagation(); isChecked ? moveMany(Array.from(checkedIds), c.key) : move(ticket.id, c.key); }}
                            style={{ fontSize:10, padding:"3px 8px", border:"0.5px solid #ddd", borderRadius:8, background:"#f8f8f8", color:"#666", cursor:"pointer", fontFamily:"inherit" }}>
                            → {c.label}{isChecked && checkedIds.size > 1 ? ` (${checkedIds.size})` : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Assistant sidebar — always mounted to preserve chat history */}
      {agencyName && (
        <AgencyAssistant
          agencyName={agencyName}
          tickets={tickets}
          agencies={agencies.map(a => a.name)}
          onAction={handleAssistantAction}
          onClose={() => setSidebarOpen(false)}
          hidden={!sidebarOpen}
        />
      )}

      {/* Detail modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, border:"0.5px solid #e5e5e5", padding:22, width:420, maxHeight:"80vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, marginBottom:4 }}>{selected.ticket_number}</div>
                <div style={{ fontSize:15, fontWeight:500, color:"#1a1a1a", lineHeight:1.4 }}>{selected.title}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#aaa", padding:"0 4px", lineHeight:1 }}>×</button>
            </div>

            <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:14 }}>
              {pill(selected.severity+" severity", SEV[selected.severity]?.bg, SEV[selected.severity]?.color)}
              {pill(COLS.find(c=>c.key===selected.status)?.label||"", COLS.find(c=>c.key===selected.status)?.countBg||"#eee", COLS.find(c=>c.key===selected.status)?.countColor||"#333")}
              {pill(selected.category, "#f0f0f0", "#555")}
            </div>

            {selected.location_text && (
              <div style={{ background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
                <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, marginBottom:4 }}>Location</div>
                <div style={{ fontSize:13, color:"#1a1a1a" }}>{selected.location_text}</div>
              </div>
            )}

            {selected.image_url && (
              <div style={{ background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
                <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>Image</div>
                {!imageLoadError ? (
                  <img src={resolveImageUrl(selected.image_url) || ""} alt="Reported issue" onError={() => setImageLoadError(true)}
                    style={{ width:"100%", maxHeight:220, objectFit:"cover", borderRadius:8, border:"0.5px solid #e5e5e5" }} />
                ) : (
                  <div style={{ fontSize:12, color:"#888" }}>Image unavailable.</div>
                )}
              </div>
            )}

            {(selected.safety_flag || selected.accessibility_flag || selected.emergency_flag) && (
              <div style={{ background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
                <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>Flags</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {selected.emergency_flag && pill("Emergency", "#FCEBEB", "#791F1F")}
                  {selected.safety_flag && pill("Safety", "#FCEBEB", "#791F1F")}
                  {selected.accessibility_flag && pill("Accessibility", "#E6F1FB", "#0C447C")}
                </div>
              </div>
            )}

            <hr style={{ border:"none", borderTop:"0.5px solid #eee", margin:"12px 0" }}/>
            <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, marginBottom:8 }}>Move ticket to</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
              {COLS.filter(c => c.key !== selected.status).map(c => (
                <button key={c.key} className="kb-move-lg" onClick={() => { move(selected.id, c.key); setSelected((s: any) => ({ ...s, status: c.key })); }}
                  style={{ fontSize:12, padding:"7px 14px", border:"0.5px solid #ddd", borderRadius:8, background:"#fafafa", color:"#333", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:c.dot }}/>
                  {c.label}
                </button>
              ))}
            </div>

            <hr style={{ border:"none", borderTop:"0.5px solid #eee", margin:"12px 0" }}/>
            <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>Agency note</div>
            <textarea placeholder="Add a note visible to your team..." style={{ width:"100%", height:72, fontSize:12, border:"0.5px solid #ddd", borderRadius:8, padding:"9px 10px", resize:"none", fontFamily:"inherit", background:"#fff", color:"#333" }}/>
            <button style={{ width:"100%", padding:10, background:"#185FA5", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit", marginTop:8 }}>Save note</button>
          </div>
        </div>
      )}
    </div>
  );
}
