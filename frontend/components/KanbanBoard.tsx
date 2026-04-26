"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const COLS = [
  { key:"ROUTED", label:"Routed", bg:"#EEF5FC", border:"#C8DEFA", dot:"#378ADD", countBg:"#B5D4F4", countColor:"#0C447C" },
  { key:"IN_PROGRESS", label:"In Progress", bg:"#FDF6EC", border:"#FAD99B", dot:"#BA7517", countBg:"#FAC775", countColor:"#633806" },
  { key:"NEEDS_MORE_INFO", label:"Needs Info", bg:"#FDF0EC", border:"#F5C4B3", dot:"#D85A30", countBg:"#F5C4B3", countColor:"#712B13" },
  { key:"RESOLVED", label:"Resolved", bg:"#EEF7E6", border:"#C0DD97", dot:"#3B6D11", countBg:"#C0DD97", countColor:"#27500A" },
];

const SEV: Record<string, { bg: string; color: string }> = {
  LOW:      { bg:"#F1EFE8", color:"#5F5E5A" },
  MEDIUM:   { bg:"#FAEEDA", color:"#854F0B" },
  HIGH:     { bg:"#FAECE7", color:"#993C1D" },
  CRITICAL: { bg:"#FCEBEB", color:"#A32D2D" },
};

const MOCK = [
  { id:"1",  title:"Large pothole on Main Street",             category:"Pothole",          severity:"MEDIUM",   status:"ROUTED",          location_text:"Main St & 4th Ave",    safety_flag:false, accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0001" },
  { id:"2",  title:"Pothole on Oak Avenue",                    category:"Pothole",          severity:"HIGH",     status:"IN_PROGRESS",     location_text:"Oak Ave near school",  safety_flag:true,  accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0002" },
  { id:"3",  title:"Broken sidewalk on 5th Street",            category:"Sidewalk",         severity:"MEDIUM",   status:"NEEDS_MORE_INFO", location_text:"5th Street",           safety_flag:false, accessibility_flag:true,  emergency_flag:false, ticket_number:"CFX-0003" },
  { id:"4",  title:"Streetlight out near community center",    category:"Streetlight",      severity:"HIGH",     status:"ROUTED",          location_text:"Community Center",     safety_flag:true,  accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0004" },
  { id:"5",  title:"Multiple streetlights out on Elm St",      category:"Streetlight",      severity:"HIGH",     status:"IN_PROGRESS",     location_text:"Elm St 2nd–4th Ave",   safety_flag:true,  accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0005" },
  { id:"6",  title:"Streetlight flickering on Park Blvd",      category:"Streetlight",      severity:"LOW",      status:"RESOLVED",        location_text:"Park Blvd",            safety_flag:false, accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0006" },
  { id:"7",  title:"Flooding on Riverside Drive",              category:"Flooding",         severity:"HIGH",     status:"ROUTED",          location_text:"Riverside Drive",      safety_flag:true,  accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0007" },
  { id:"8",  title:"Water leak on Oak Street",                 category:"Water Leak",       severity:"CRITICAL", status:"IN_PROGRESS",     location_text:"Oak St & 3rd",         safety_flag:true,  accessibility_flag:false, emergency_flag:true,  ticket_number:"CFX-0008" },
  { id:"9",  title:"Park equipment damaged",                   category:"Park Damage",      severity:"HIGH",     status:"ROUTED",          location_text:"Central Park",         safety_flag:true,  accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0009" },
  { id:"10", title:"Graffiti on underpass wall",               category:"Graffiti",         severity:"LOW",      status:"ROUTED",          location_text:"Underpass on 1st",     safety_flag:false, accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0010" },
  { id:"11", title:"Abandoned vehicle on 2nd Ave",             category:"Abandoned Vehicle",severity:"LOW",      status:"RESOLVED",        location_text:"2nd Ave",              safety_flag:false, accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0011" },
  { id:"12", title:"Illegal dumping behind plaza",             category:"Illegal Dumping",  severity:"MEDIUM",   status:"ROUTED",          location_text:"Behind shopping plaza",safety_flag:false, accessibility_flag:false, emergency_flag:false, ticket_number:"CFX-0012" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type FilterType = "ALL" | "HIGH" | "CRITICAL" | "safety";

interface KanbanBoardProps {
  agencyName?: string;
}

export default function KanbanBoard({ agencyName }: KanbanBoardProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [filter, setFilter] = useState<FilterType>("ALL");

  useEffect(() => {
    const url = agencyName
      ? `${API_URL}/api/agency/tickets?agency_name=${encodeURIComponent(agencyName)}`
      : `${API_URL}/api/agency/tickets`;

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        const list = Array.isArray(data) ? data : data.tickets ?? [];
        setTickets(list.length > 0 ? list : MOCK);
        setUsingMock(list.length === 0);
        setLoading(false);
      })
      .catch(() => { setTickets(MOCK); setUsingMock(true); setLoading(false); });
  }, [agencyName]);

  const move = (id: string, status: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (selected?.id === id) setSelected(null);
    if (!usingMock) fetch(`/api/tickets/${id}/status`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status }) });
  };

  const filtered = tickets.filter(t => {
    if (filter === "HIGH") return t.severity === "HIGH";
    if (filter === "CRITICAL") return t.severity === "CRITICAL";
    if (filter === "safety") return t.safety_flag;
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

  const s = { total: tickets.length, critical: tickets.filter(t => t.severity==="CRITICAL").length, open: tickets.filter(t => t.status!=="RESOLVED").length, resolved: tickets.filter(t => t.status==="RESOLVED").length };

  const pill = (label: string, bg: string, color: string) => (
    <span style={{ fontSize:10, fontWeight:500, padding:"2px 7px", borderRadius:10, background:bg, color, letterSpacing:.2 }}>{label}</span>
  );

  const filterBtnStyle = (f: FilterType) => ({
    fontSize:12, padding:"5px 12px", borderRadius:20, border:`0.5px solid ${filter===f?"#85B7EB":"#ddd"}`,
    background: filter===f ? "#E6F1FB" : "#fff", color: filter===f ? "#0C447C" : "#888",
    cursor:"pointer", fontFamily:"inherit",
  });

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif", background:"#f5f6f8", minHeight:"100vh", padding:24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.kb-card:hover{border-color:#bbb!important;transform:translateY(-1px)}.kb-move:hover{background:#fff!important;color:#333!important}.kb-move-lg:hover{background:#f0f0f0!important}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, background:"#185FA5", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" fill="white" opacity=".9"/><rect x="10" y="2" width="6" height="6" rx="1.5" fill="white" opacity=".6"/><rect x="2" y="10" width="6" height="6" rx="1.5" fill="white" opacity=".6"/><rect x="10" y="10" width="6" height="6" rx="1.5" fill="white" opacity=".3"/></svg>
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {agencyName && (
                <Link href="/agency" style={{ fontSize:12, color:"#888", textDecoration:"none" }}>← Departments</Link>
              )}
            </div>
            <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>
              {agencyName ?? "All Departments"}
            </div>
            <div style={{ fontSize:11, color:"#888" }}>Agency operations</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {usingMock && <span style={{ fontSize:11, background:"#FAEEDA", color:"#854F0B", padding:"3px 10px", borderRadius:20, border:"0.5px solid #FAC775" }}>Demo data</span>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
        {[["Total tickets", s.total, "#1a1a1a", ""], ["Critical", s.critical, "#A32D2D", "immediate action"], ["Open", s.open, "#185FA5", "across all stages"], ["Resolved", s.resolved, "#3B6D11", "this period"]].map(([label, val, color, sub]) => (
          <div key={label as string} style={{ background:"#fff", border:"0.5px solid #e5e5e5", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:26, fontWeight:500, color: color as string }}>{val}</div>
            {sub && <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <span style={{ fontSize:12, color:"#888", marginRight:4 }}>Filter:</span>
        {(["ALL","HIGH","CRITICAL","safety"] as FilterType[]).map(f => (
          <button key={f} style={filterBtnStyle(f)} onClick={() => setFilter(f)}>
            {f === "ALL" ? "All" : f === "safety" ? "Safety flags" : f.charAt(0)+f.slice(1).toLowerCase()}
          </button>
        ))}
        <div style={{ marginLeft:"auto", fontSize:11, color:"#aaa" }}>Showing {filtered.length} ticket{filtered.length!==1?"s":""}</div>
      </div>

      {/* Kanban board */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:10 }}>
        {COLS.map(col => {
          const items = filtered.filter(t => t.status === col.key);
          return (
            <div key={col.key} style={{ background:col.bg, border:`0.5px solid ${col.border}`, borderRadius:12, padding:12 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, paddingBottom:10, borderBottom:`0.5px solid ${col.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, fontWeight:500, color:"#1a1a1a" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:col.dot }}/>
                  {col.label}
                </div>
                <span style={{ fontSize:11, fontWeight:500, padding:"2px 8px", borderRadius:10, background:col.countBg, color:col.countColor }}>{items.length}</span>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {items.length === 0 && <div style={{ textAlign:"center", padding:"28px 0", fontSize:12, color:"#bbb" }}>No tickets here</div>}
                {items.map(ticket => (
                  <div key={ticket.id} className="kb-card" onClick={() => setSelected(ticket)}
                    style={{ background:"#fff", border:"0.5px solid #e8e8e8", borderRadius:10, padding:12, cursor:"pointer", transition:"border-color .15s, transform .1s" }}>
                    {ticket.emergency_flag && (
                      <div style={{ background:"#FCEBEB", borderLeft:"3px solid #E24B4A", borderRadius:4, padding:"3px 8px", fontSize:10, fontWeight:500, color:"#791F1F", marginBottom:8, letterSpacing:.3 }}>
                        Emergency response needed
                      </div>
                    )}
                    <div style={{ fontSize:13, fontWeight:500, color:"#1a1a1a", lineHeight:1.4, marginBottom:8 }}>{ticket.title}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
                      {pill(ticket.severity, SEV[ticket.severity]?.bg, SEV[ticket.severity]?.color)}
                      {pill(ticket.category, "#f0f0f0", "#666")}
                      {pill(ticket.ticket_number, "#f5f5f5", "#aaa")}
                    </div>
                    {ticket.safety_flag && <div style={{ marginBottom:5 }}>{pill("Safety flag", "#FCEBEB", "#791F1F")}</div>}
                    {ticket.accessibility_flag && <div style={{ marginBottom:5 }}>{pill("Accessibility", "#E6F1FB", "#0C447C")}</div>}
                    {ticket.location_text && (
                      <div style={{ fontSize:11, color:"#999", marginBottom:8, display:"flex", alignItems:"center", gap:4 }}>
                        <svg width="9" height="12" viewBox="0 0 10 12" fill="none"><path d="M5 0C3.07 0 1.5 1.57 1.5 3.5c0 2.63 3.5 8.5 3.5 8.5s3.5-5.87 3.5-8.5C8.5 1.57 6.93 0 5 0zm0 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="#999"/></svg>
                        {ticket.location_text}
                      </div>
                    )}
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, paddingTop:8, borderTop:"0.5px solid #f0f0f0" }}>
                      {COLS.filter(c => c.key !== col.key).map(c => (
                        <button key={c.key} className="kb-move" onClick={e => { e.stopPropagation(); move(ticket.id, c.key); }}
                          style={{ fontSize:10, padding:"3px 8px", border:"0.5px solid #ddd", borderRadius:8, background:"#f8f8f8", color:"#666", cursor:"pointer", fontFamily:"inherit" }}>
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

      {/* Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ minHeight:400, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:12, marginTop:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, border:"0.5px solid #e5e5e5", padding:22, width:400, maxHeight:540, overflowY:"auto" }}>
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

            <div style={{ background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
              <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, marginBottom:4 }}>Location</div>
              <div style={{ fontSize:13, color:"#1a1a1a" }}>{selected.location_text}</div>
            </div>

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
                <button key={c.key} className="kb-move-lg" onClick={() => { move(selected.id, c.key); setSelected(null); }}
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
