"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation } from "@11labs/client";
import { AssistantAction } from "./AgencyAssistant";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const AGENT_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID_VOICE_DASHBOARD ??
  process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ??
  "";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TicketSummary {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  severity: string;
  category: string;
  location_text?: string;
  emergency_flag?: boolean;
  safety_flag?: boolean;
  accessibility_flag?: boolean;
  created_at?: string;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
  actioned?: string; // brief description of board changes
}

interface Props {
  agencyName: string;
  tickets: TicketSummary[];
  agencies: string[];
  onAction: (actions: AssistantAction[]) => void;
}

type VoiceState = "idle" | "connecting" | "listening" | "speaking" | "processing";

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoiceDashboardAssistant({ agencyName, tickets, agencies, onAction }: Props) {
  const [voiceState, setVoiceState]   = useState<VoiceState>("idle");
  const [turns, setTurns]             = useState<Turn[]>([]);
  const [panelOpen, setPanelOpen]     = useState(false);
  const convRef                       = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const ticketsRef                    = useRef(tickets);
  const bottomRef                     = useRef<HTMLDivElement>(null);

  // Keep ref fresh so the onToolCall closure always sees latest ticket state
  useEffect(() => { ticketsRef.current = tickets; }, [tickets]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const stop = useCallback(async () => {
    await convRef.current?.endSession();
    convRef.current = null;
    setVoiceState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!AGENT_ID) {
      alert("Add NEXT_PUBLIC_ELEVENLABS_AGENT_ID_VOICE_DASHBOARD to frontend/.env.local");
      return;
    }
    setVoiceState("connecting");
    setPanelOpen(true);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // The current @11labs/client typings do not expose onToolCall yet,
      // but runtime supports it for agent tool callbacks.
      const conv = await Conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "webrtc",

        // ── The bridge: ElevenLabs calls this tool → we call Gemma ──────────
        onToolCall: async ({ tool_name, parameters }: { tool_name: string; parameters: Record<string, unknown> }) => {
          if (tool_name !== "process_request") return {};

          const userMessage = String(parameters.user_message ?? "").trim();
          if (!userMessage) return { response: "I didn't catch that, could you repeat?" };

          setVoiceState("processing");

          try {
            const currentTickets = ticketsRef.current;

            const res = await fetch(`${API_URL}/api/agency/assistant`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: userMessage,
                department: agencyName,
                tickets: currentTickets.slice(0, 25).map(t => ({
                  id:                 t.id,
                  ticket_number:      t.ticket_number,
                  title:              t.title,
                  status:             t.status,
                  category:           t.category,
                  severity:           t.severity,
                  location_text:      t.location_text      ?? null,
                  emergency_flag:     t.emergency_flag     ?? false,
                  safety_flag:        t.safety_flag        ?? false,
                  accessibility_flag: t.accessibility_flag ?? false,
                  created_at:         t.created_at         ?? null,
                })),
                agencies,
              }),
            });

            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();

            const spokenText: string         = data.message || "Done.";
            const actions: AssistantAction[] = data.actions ?? [];

            // Apply board actions via existing APIs
            if (actions.length) onAction(actions);

            // Summarise what changed for the transcript chip
            const actionedLabel = actions.length
              ? actions.map(a =>
                  a.type === "move_status"
                    ? `Moved ${a.ticket_ids.length} ticket(s) → ${a.new_status}`
                    : `Forwarded ${a.ticket_ids.length} ticket(s) → ${a.department}`
                ).join("; ")
              : undefined;

            setTurns(prev => [
              ...prev,
              { role: "user",      text: userMessage },
              { role: "assistant", text: spokenText, actioned: actionedLabel },
            ]);

            // Return spoken text to ElevenLabs for TTS
            return { response: spokenText };

          } catch {
            return { response: "Sorry, I had trouble reaching the server. Please try again." };
          }
        },

        onModeChange: ({ mode }: { mode: string }) => {
          if (mode === "listening") setVoiceState("listening");
          if (mode === "speaking")  setVoiceState("speaking");
        },
        onDisconnect: () => {
          setVoiceState("idle");
          convRef.current = null;
        },
        onError: () => stop(),
      } as Parameters<typeof Conversation.startSession>[0] & {
        onToolCall?: (args: { tool_name: string; parameters: Record<string, unknown> }) => Promise<Record<string, unknown>>;
      });

      convRef.current = conv;
    } catch {
      setVoiceState("idle");
    }
  }, [agencyName, agencies, onAction, stop]);

  // Clean up on unmount
  useEffect(() => () => { convRef.current?.endSession(); }, []);

  const isActive = voiceState !== "idle";

  return (
    <>
      {/* ── Trigger button ── */}
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <button
          onClick={isActive ? stop : start}
          title={isActive ? "End voice session" : "Start voice assistant"}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
            border:      isActive ? "1px solid #ef4444" : "0.5px solid #ddd",
            background:  isActive ? "#fef2f2"           : "#fff",
            color:       isActive ? "#ef4444"           : "#444",
            cursor:      voiceState === "connecting"    ? "wait" : "pointer",
            fontFamily: "inherit", transition: "all .2s",
            boxShadow:   isActive ? "0 0 0 3px rgba(239,68,68,.1)" : "none",
          }}
        >
          <VoiceIcon state={voiceState} />
          {voiceState === "idle"        && "Voice Assistant"}
          {voiceState === "connecting"  && "Connecting…"}
          {voiceState === "listening"   && "Listening…"}
          {voiceState === "speaking"    && "Speaking…"}
          {voiceState === "processing"  && "Thinking…"}
        </button>

        {voiceState === "listening" && (
          <span style={{
            position: "absolute", inset: -3, borderRadius: 20,
            border: "2px solid #ef4444", opacity: .4, pointerEvents: "none",
            animation: "voicePing 1.2s ease-out infinite",
          }} />
        )}
      </div>

      {/* ── Floating transcript panel ── */}
      {panelOpen && (
        <div style={panel}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", flexShrink: 0,
            background: isActive ? "#fff5f5" : "#f8fafc",
            borderBottom: "1px solid #f1f5f9",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <VoiceWave active={voiceState === "speaking"} listening={voiceState === "listening"} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Voice Assistant</div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>Scoped to {agencyName}</div>
              </div>
            </div>
            <button
              onClick={() => { stop(); setPanelOpen(false); setTurns([]); }}
              style={{ background: "none", border: "none", fontSize: 15, color: "#94a3b8", cursor: "pointer", padding: "2px 4px" }}
            >✕</button>
          </div>

          {/* Transcript */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
            {turns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 8px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🎤</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
                  {voiceState === "connecting"
                    ? "Connecting to voice assistant…"
                    : "Speak naturally to manage your tickets."}
                </div>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                  {SAMPLE_PROMPTS.map((p, i) => (
                    <div key={i} style={sampleChip}>{p}</div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {turns.map((turn, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    {turn.role === "user" ? (
                      <div style={userBubble}>{turn.text}</div>
                    ) : (
                      <div>
                        <div style={aiBubble}>{turn.text}</div>
                        {turn.actioned && (
                          <div style={actionChip}>
                            <span>✅</span>
                            <span>{turn.actioned}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Status bar */}
          <div style={{
            padding: "8px 14px", borderTop: "1px solid #f1f5f9",
            background: "#f8fafc", flexShrink: 0,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <StatusDot state={voiceState} />
            <span style={{ fontSize: 11, color: "#64748b", flex: 1 }}>
              {STATE_LABELS[voiceState]}
            </span>
            {isActive && (
              <button
                onClick={stop}
                style={{ fontSize: 11, padding: "3px 10px", border: "0.5px solid #fca5a5", borderRadius: 6, background: "#fef2f2", color: "#ef4444", cursor: "pointer", fontFamily: "inherit" }}
              >
                End session
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes voicePing { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.35);opacity:0} }
        @keyframes voiceBar  { 0%,100%{transform:scaleY(.35)} 50%{transform:scaleY(1)} }
      `}</style>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VoiceIcon({ state }: { state: VoiceState }) {
  if (state === "connecting" || state === "processing") {
    return (
      <span style={{
        width: 12, height: 12, border: "2px solid currentColor",
        borderTopColor: "transparent", borderRadius: "50%",
        display: "inline-block", animation: "spin .7s linear infinite",
      }} />
    );
  }
  if (state === "speaking") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function VoiceWave({ active, listening }: { active: boolean; listening: boolean }) {
  const color = listening ? "#ef4444" : active ? "#1a56db" : "#cbd5e1";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 22, width: 22 }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          width: 3, borderRadius: 2, background: color,
          height: (active || listening) ? 18 : 6,
          transition: "height .15s, background .2s",
          animation: (active || listening) ? `voiceBar ${.7 + i * .1}s ease-in-out ${i * .12}s infinite` : "none",
        }} />
      ))}
    </div>
  );
}

function StatusDot({ state }: { state: VoiceState }) {
  const colors: Record<VoiceState, string> = {
    idle:        "#cbd5e1",
    connecting:  "#fbbf24",
    listening:   "#ef4444",
    speaking:    "#1a56db",
    processing:  "#8b5cf6",
  };
  return (
    <div style={{ width: 7, height: 7, borderRadius: "50%", background: colors[state], flexShrink: 0, transition: "background .3s" }} />
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATE_LABELS: Record<VoiceState, string> = {
  idle:        "Disconnected",
  connecting:  "Establishing connection…",
  listening:   "Listening to you…",
  speaking:    "Assistant speaking…",
  processing:  "Processing with Gemma…",
};

const SAMPLE_PROMPTS = [
  "📅 Plan my day",
  "🚨 Which issues need immediate attention?",
  "⚡ Move all critical tickets to In Progress",
  "🔀 Forward flooding tickets to Water Services",
  "⏳ List long pending issues",
];

// ── Styles ────────────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
  position:    "fixed",
  bottom:      24,
  right:       24,
  width:       340,
  maxHeight:   460,
  background:  "#fff",
  border:      "1px solid #e2e8f0",
  borderRadius: 16,
  boxShadow:   "0 8px 32px rgba(0,0,0,.12)",
  zIndex:      40,
  display:     "flex",
  flexDirection: "column",
  overflow:    "hidden",
};

const userBubble: React.CSSProperties = {
  background:   "#1a56db",
  color:        "#fff",
  borderRadius: "12px 12px 2px 12px",
  padding:      "8px 12px",
  fontSize:     13,
  marginLeft:   "18%",
  lineHeight:   1.45,
  wordBreak:    "break-word",
};

const aiBubble: React.CSSProperties = {
  background:   "#f8fafc",
  border:       "1px solid #e2e8f0",
  borderRadius: "12px 12px 12px 2px",
  padding:      "8px 12px",
  fontSize:     13,
  marginRight:  "8%",
  color:        "#1e293b",
  lineHeight:   1.45,
};

const actionChip: React.CSSProperties = {
  display:      "flex",
  alignItems:   "center",
  gap:          6,
  fontSize:     11,
  color:        "#166534",
  background:   "#dcfce7",
  border:       "1px solid #bbf7d0",
  borderRadius: 6,
  padding:      "3px 8px",
  marginTop:    4,
  marginRight:  "8%",
};

const sampleChip: React.CSSProperties = {
  fontSize:     12,
  color:        "#475569",
  background:   "#f8fafc",
  border:       "1px solid #e2e8f0",
  borderRadius: 8,
  padding:      "6px 10px",
  textAlign:    "left",
};
