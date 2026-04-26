"use client";
import { useEffect, useState } from "react";

const COLS = [
  { key:"ROUTED", label:"Routed", bg:"#E6F1FB", border:"#B5D4F4", dot:"#378ADD" },
  { key:"IN_PROGRESS", label:"In Progress", bg:"#FAEEDA", border:"#FAC775", dot:"#BA7517" },
  { key:"NEEDS_MORE_INFO", label:"Needs More Info", bg:"#FAECE7", border:"#F5C4B3", dot:"#D85A30" },
  { key:"RESOLVED", label:"Resolved", bg:"#EAF3DE", border:"#C0DD97", dot:"#3B6D11" },
];

const SEV: Record<string, {bg:string, color:string}> = {
  LOW:      { bg:"#F1EFE8", color:"#5F5E5A" },
  MEDIUM:   { bg:"#FAEEDA", color:"#854F0B" },
  HIGH:     { bg:"#FAECE7", color:"#993C1D" },
  CRITICAL: { bg:"#FCEBEB", color:"#A32D2D" },
};

const MOCK = [
  { id:"1", title:"Large pothole on Main Street", category:"POTHOLE", severity:"MEDIUM", status:"ROUTED", location_text:"Main St & 4th Ave", safety_flag:false, accessibility_flag:false, emergency_flag:false },
  { id:"2", title:"Pothole on Oak Avenue", category:"POTHOLE", severity:"HIGH", status:"IN_PROGRESS", location_text:"Oak Ave near school", safety_flag:true, accessibility_flag:false, emergency_flag:false },
  { id:"3", title:"Broken sidewalk on 5th Street", category:"SIDEWALK_OBSTRUCTION", severity:"MEDIUM", status:"NEEDS_MORE_INFO", location_text:"5th Street", safety_flag:false, accessibility_flag:true, emergency_flag:false },
  { id:"4", title:"Streetlight out near community center", category:"STREETLIGHT_OUTAGE", severity:"HIGH", status:"ROUTED", location_text:"Community Center", safety_flag:true, accessibility_flag:false, emergency_flag:false },
  { id:"5", title:"Multiple streetlights out on Elm St", category:"STREETLIGHT_OUTAGE", severity:"HIGH", status:"IN_PROGRESS", location_text:"Elm St 2nd-4th Ave", safety_flag:true, accessibility_flag:false, emergency_flag:false },
  { id:"6", title:"Streetlight flickering on Park Blvd", category:"STREETLIGHT_OUTAGE", severity:"LOW", status:"RESOLVED", location_text:"Park Blvd", safety_flag:false, accessibility_flag:false, emergency_flag:false },
  { id:"7", title:"Flooding on Riverside Drive", category:"FLOODING", severity:"HIGH", status:"ROUTED", location_text:"Riverside Drive", safety_flag:true, accessibility_flag:false, emergency_flag:false },
  { id:"8", title:"Water leak on Oak Street", category:"WATER_LEAK", severity:"CRITICAL", status:"IN_PROGRESS", location_text:"Oak St & 3rd", safety_flag:true, accessibility_flag:false, emergency_flag:true },
  { id:"9", title:"Park equipment damaged", category:"PARK_DAMAGE", severity:"HIGH", status:"ROUTED", location_text:"Central Park", safety_flag:true, accessibility_flag:false, emergency_flag:false },
  { id:"10", title:"Graffiti on underpass wall", category:"GRAFFITI", severity:"LOW", status:"ROUTED", location_text:"Underpass on 1st", safety_flag:false, accessibility_flag:false, emergency_flag:false },
  { id:"11", title:"Abandoned vehicle on 2nd Ave", category:"ABANDONED_VEHICLE", severity:"LOW", status:"RESOLVED", location_text:"2nd Ave", safety_flag:false, accessibility_flag:false, emergency_flag:false },
  { id:"12", title:"Illegal dumping behind plaza", category:"ILLEGAL_DUMPING", severity:"MEDIUM", status:"ROUTED", location_text:"Behind shopping plaza", safety_flag:false, accessibility_flag:false, emergency_flag:false },
];

export default function KanbanBoard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    fetch("/api/agency/tickets")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        const list = Array.isArray(data) ? data : data.tickets ?? [];
        setTickets(list.length > 0 ? list : MOCK);
        setUsingMock(list.length === 0);
        setLoading(false);
      })
      .catch(() => { setTickets(MOCK); setUsingMock(true); setLoading(false); });
  }, []);

  const move = (id: string, status: string) => {
    setTickets(prev => prev.map(t => t.id === id ? {...t, status} : t));
    if (selected?.id === id) setSelected((p: any) => ({...p, status}));
    if (!usingMock) fetch(`/api/tickets/${id}/status`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({status}) });
  };

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300}}><p style={{color:"#888"}}>Loading tickets...</p></div>;

  const total = tickets.length;
  const critical = tickets.filter(t => t.severity === "CRITICAL").length;
  const resolved = tickets.filter(t => t.status === "RESOLVED").length;
  const safety = tickets.filter(t => t.safety_flag).length;

  return (
    <div style={{padding:"24px",fontFamily:"system-ui,sans-serif",background:"#f8f9fa",minHeight:"100vh"}}>
      <h1 style={{fontSize:24,fontWeight:600,marginBottom:4,color:"#1a1a1a"}}>Agency Dashboard</h1>
      <p style={{color:"#666",marginBottom:16,fontSize:14}}>Manage and track civic issue tickets</p>

      {usingMock && (
        <div style={{background:"#FAEEDA",border:"1px solid #FAC775",borderRadius:8,padding:"8px 14px",marginBottom:16,fontSize:13,color:"#854F0B",display:"inline-block"}}>
          ⚠️ Showing demo data — connect backend to see live tickets
        </div>
      )}

      {/* Stats */}
      <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        {[["Total Tickets",total,"#378ADD"],["Critical",critical,"#A32D2D"],["Resolved",resolved,"#3B6D11"],["Safety Flags",safety,"#D85A30"]].map(([label,val,color]) => (
          <div key={label as string} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:12,padding:"12px 20px",minWidth:120}}>
            <div style={{fontSize:12,color:"#888",marginBottom:4}}>{label}</div>
            <div style={{fontSize:28,fontWeight:600,color:color as string}}>{val}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {COLS.map(col => {
          const items = tickets.filter(t => t.status === col.key);
          return (
            <div key={col.key} style={{background:col.bg,border:`1px solid ${col.border}`,borderRadius:12,padding:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:col.dot}}/>
                  <span style={{fontWeight:600,fontSize:13,color:"#1a1a1a"}}>{col.label}</span>
                </div>
                <span style={{background:col.border,color:"#333",borderRadius:20,padding:"1px 8px",fontSize:12,fontWeight:600}}>{items.length}</span>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {items.length === 0 && <p style={{fontSize:12,color:"#aaa",textAlign:"center",padding:"20px 0"}}>No tickets</p>}
                {items.map(ticket => (
                  <div key={ticket.id} onClick={() => setSelected(ticket)} style={{background:"#fff",border:"1px solid #e8e8e8",borderRadius:10,padding:12,cursor:"pointer",transition:"box-shadow 0.15s"}}>
                    {ticket.emergency_flag && (
                      <div style={{background:"#FCEBEB",color:"#A32D2D",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,marginBottom:6}}>EMERGENCY</div>
                    )}
                    <p style={{fontSize:13,fontWeight:500,color:"#1a1a1a",marginBottom:8,lineHeight:1.4}}>{ticket.title}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:SEV[ticket.severity]?.bg,color:SEV[ticket.severity]?.color,fontWeight:500}}>{ticket.severity}</span>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#f0f0f0",color:"#555"}}>{ticket.category?.replace(/_/g," ")}</span>
                    </div>
                    {ticket.safety_flag && <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#FCEBEB",color:"#A32D2D",marginRight:4}}>🚨 Safety</span>}
                    {ticket.accessibility_flag && <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#E6F1FB",color:"#185FA5"}}>♿ Access</span>}
                    {ticket.location_text && <p style={{fontSize:11,color:"#888",marginTop:6}}>📍 {ticket.location_text}</p>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
                      {COLS.filter(c => c.key !== col.key).map(c => (
                        <button key={c.key} onClick={e => { e.stopPropagation(); move(ticket.id, c.key); }}
                          style={{fontSize:11,padding:"3px 8px",border:"1px solid #ddd",borderRadius:20,background:"#f8f8f8",color:"#555",cursor:"pointer"}}>
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
        <div onClick={() => setSelected(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:24,width:400,maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <h2 style={{fontSize:16,fontWeight:600,color:"#1a1a1a",flex:1,marginRight:8}}>{selected.title}</h2>
              <button onClick={() => setSelected(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#888"}}>×</button>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
              <span style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:SEV[selected.severity]?.bg,color:SEV[selected.severity]?.color,fontWeight:500}}>{selected.severity}</span>
              <span style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:"#f0f0f0",color:"#555"}}>{selected.category?.replace(/_/g," ")}</span>
              {selected.safety_flag && <span style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:"#FCEBEB",color:"#A32D2D"}}>🚨 Safety</span>}
              {selected.emergency_flag && <span style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:"#FCEBEB",color:"#A32D2D",fontWeight:600}}>⚠️ Emergency</span>}
            </div>
            {selected.location_text && (
              <div style={{background:"#f8f8f8",borderRadius:8,padding:"8px 12px",marginBottom:12}}>
                <p style={{fontSize:12,color:"#888",marginBottom:2}}>Location</p>
                <p style={{fontSize:13,color:"#333"}}>📍 {selected.location_text}</p>
              </div>
            )}
            <p style={{fontSize:12,color:"#888",marginBottom:8}}>Move to</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
              {COLS.filter(c => c.key !== selected.status).map(c => (
                <button key={c.key} onClick={() => { move(selected.id, c.key); setSelected(null); }}
                  style={{fontSize:13,padding:"6px 14px",border:"1px solid #ddd",borderRadius:20,background:"#f8f8f8",color:"#333",cursor:"pointer"}}>
                  {c.label}
                </button>
              ))}
            </div>
            <textarea placeholder="Add agency note..." style={{width:"100%",height:80,fontSize:13,border:"1px solid #ddd",borderRadius:8,padding:10,resize:"none"}}/>
          </div>
        </div>
      )}
    </div>
  );
}
