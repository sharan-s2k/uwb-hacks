"use client";
import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssistantAction {
  type: "move_status" | "forward_department";
  ticket_ids: string[];
  new_status?: string;
  department?: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  actions?: AssistantAction[];
  loading?: boolean;
}

interface TicketSummary {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  category: string;
  severity: string;
  location_text?: string;
}

interface Props {
  agencyName: string;
  tickets: TicketSummary[];
  agencies: string[];           // list of department names
  onAction: (actions: AssistantAction[]) => void;
  onClose: () => void;
  hidden?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  ROUTED: "Routed",
  IN_PROGRESS: "In Progress",
  NEEDS_MORE_INFO: "Needs Info",
  RESOLVED: "Resolved",
};

const SUGGESTIONS = [
  "Move all critical tickets to In Progress",
  "Which tickets need immediate attention?",
  "Mark all resolved tickets",
  "Forward flooding tickets to Water Services",
  "Show me all emergency tickets",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgencyAssistant({ agencyName, tickets, agencies, onAction, onClose, hidden }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `Hi! I'm the AI assistant for **${agencyName}**. I can help you:\n- Move tickets between statuses\n- Forward tickets to other departments\n- Answer questions about your queue\n\nWhat would you like to do?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Message = { role: "user", text: text.trim() };
    const placeholder: Message = { role: "assistant", text: "", loading: true };
    setMessages(prev => [...prev, userMsg, placeholder]);
    setInput("");
    setBusy(true);

    try {
      const body = {
        message: text.trim(),
        department: agencyName,
        tickets: tickets.slice(0, 25).map(t => ({
          id: t.id,
          ticket_number: t.ticket_number,
          title: t.title,
          status: t.status,
          category: t.category,
          severity: t.severity,
          location_text: t.location_text ?? null,
        })),
        agencies,
      };

      const res = await fetch(`${API_URL}/api/agency/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      const aiMsg: Message = {
        role: "assistant",
        text: data.message || "Done.",
        actions: data.actions ?? [],
      };

      setMessages(prev => [...prev.slice(0, -1), aiMsg]);

      // Execute actions automatically
      if (data.actions?.length) {
        onAction(data.actions);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", text: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div style={{ ...s.panel, display: hidden ? "none" : "flex" }}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>🤖 AI Assistant</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Scoped to {agencyName}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>
            {tickets.length} tickets
          </span>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
      </div>

      {/* Messages */}
      <div style={s.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            {msg.role === "user" ? (
              <div style={s.userBubble}>{msg.text}</div>
            ) : (
              <div style={s.aiBubble}>
                {msg.loading ? (
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>Thinking…</span>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                      {msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}
                    </div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>
                          Actions taken
                        </div>
                        {msg.actions.map((a, ai) => (
                          <div key={ai} style={s.actionChip}>
                            {a.type === "move_status" ? (
                              <>
                                <span>📋</span>
                                <span>Moved {a.ticket_ids.length} ticket{a.ticket_ids.length > 1 ? "s" : ""} → {STATUS_LABELS[a.new_status ?? ""] ?? a.new_status}</span>
                              </>
                            ) : (
                              <>
                                <span>🔀</span>
                                <span>Forwarded {a.ticket_ids.length} ticket{a.ticket_ids.length > 1 ? "s" : ""} → {a.department}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (show only when idle and < 3 user messages) */}
      {!busy && messages.filter(m => m.role === "user").length < 2 && (
        <div style={s.suggestions}>
          {SUGGESTIONS.slice(0, 3).map((s, i) => (
            <button key={i} style={sug} onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={s.inputRow}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your tickets…"
          rows={2}
          disabled={busy}
          style={s.textarea}
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          style={{
            ...s.sendBtn,
            opacity: busy || !input.trim() ? 0.45 : 1,
            cursor: busy || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  panel: {
    position: "fixed",
    top: 56,          // below navbar
    right: 0,
    bottom: 0,
    width: 360,
    background: "#fff",
    borderLeft: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    zIndex: 30,
    boxShadow: "-4px 0 24px rgba(0,0,0,.08)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid #f1f5f9",
    background: "#f8fafc",
    flexShrink: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 16,
    color: "#94a3b8",
    cursor: "pointer",
    lineHeight: 1,
    padding: "2px 4px",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 14px",
  },
  userBubble: {
    background: "#1a56db",
    color: "#fff",
    borderRadius: "12px 12px 2px 12px",
    padding: "9px 13px",
    fontSize: 13,
    lineHeight: 1.5,
    marginLeft: "20%",
    wordBreak: "break-word",
  },
  aiBubble: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px 12px 12px 2px",
    padding: "10px 13px",
    marginRight: "10%",
  },
  actionChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    color: "#166534",
    background: "#dcfce7",
    border: "1px solid #bbf7d0",
    borderRadius: 6,
    padding: "3px 8px",
  },
  suggestions: {
    padding: "0 14px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    flexShrink: 0,
  },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "12px 14px",
    borderTop: "1px solid #f1f5f9",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    fontSize: 13,
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "9px 12px",
    resize: "none",
    fontFamily: "inherit",
    outline: "none",
    lineHeight: 1.5,
    color: "#1e293b",
  },
  sendBtn: {
    width: 36,
    height: 36,
    background: "#1a56db",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 18,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};

const sug: React.CSSProperties = {
  fontSize: 11,
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
};
