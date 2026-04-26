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
  emergency_flag?: boolean;
  safety_flag?: boolean;
  accessibility_flag?: boolean;
  created_at?: string;
}

interface Props {
  agencyName: string;
  tickets: TicketSummary[];
  agencies: string[];
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
  { icon: "📅", text: "Plan my day" },
  { icon: "🚨", text: "Which issues require my immediate attention?" },
  { icon: "📊", text: "Show distribution of issue types" },
  { icon: "⏳", text: "List long pending issues" },
  { icon: "⚡", text: "Move all critical tickets to In Progress" },
];

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    if (!line.trim()) {
      return <div key={li} style={{ height: 6 }} />;
    }

    const isBullet = /^[-•*]\s/.test(line);
    const isNumbered = /^\d+\.\s/.test(line);
    const isHeading = /^\*\*(.+)\*\*$/.test(line.trim());

    const renderInline = (raw: string) => {
      const parts = raw.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((p, i) => {
        const boldMatch = p.match(/^\*\*(.+)\*\*$/);
        return boldMatch
          ? <strong key={i} style={{ fontWeight: 600, color: "#0f172a" }}>{boldMatch[1]}</strong>
          : <span key={i}>{p}</span>;
      });
    };

    if (isHeading) {
      const inner = line.trim().replace(/^\*\*|\*\*$/g, "");
      return (
        <div key={li} style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginTop: 10, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".05em" }}>
          {inner}
        </div>
      );
    }

    if (isBullet) {
      const content = line.replace(/^[-•*]\s/, "");
      return (
        <div key={li} style={{ display: "flex", gap: 7, marginBottom: 3, alignItems: "flex-start" }}>
          <span style={{ color: "#1a56db", flexShrink: 0, marginTop: 1, fontSize: 11 }}>•</span>
          <span style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.55 }}>{renderInline(content)}</span>
        </div>
      );
    }

    if (isNumbered) {
      const num = line.match(/^(\d+)\./)?.[1];
      const content = line.replace(/^\d+\.\s/, "");
      return (
        <div key={li} style={{ display: "flex", gap: 7, marginBottom: 3, alignItems: "flex-start" }}>
          <span style={{ color: "#1a56db", flexShrink: 0, fontWeight: 600, fontSize: 12, minWidth: 16, textAlign: "right" }}>{num}.</span>
          <span style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.55 }}>{renderInline(content)}</span>
        </div>
      );
    }

    return (
      <div key={li} style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.55, marginBottom: 3 }}>
        {renderInline(line)}
      </div>
    );
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgencyAssistant({ agencyName, tickets, agencies, onAction, onClose, hidden }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `Hi! I'm the AI assistant for **${agencyName}**. I can help you:\n- Plan your day based on ticket priorities\n- Identify issues needing immediate attention\n- Analyse the distribution of issue types\n- Surface long-pending tickets\n- Move tickets between statuses\n- Forward tickets to other departments\n\nWhat would you like to do?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!hidden) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, hidden]);

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
          emergency_flag: t.emergency_flag ?? false,
          safety_flag: t.safety_flag ?? false,
          accessibility_flag: t.accessibility_flag ?? false,
          created_at: t.created_at ?? null,
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

      if (data.actions?.length) {
        onAction(data.actions);
      }
    } catch {
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

  const showSuggestions = !busy && messages.filter(m => m.role === "user").length < 2;

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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={s.spinner} />
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>Thinking…</span>
                  </div>
                ) : (
                  <>
                    <div>{renderMarkdown(msg.text)}</div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
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

      {/* Suggestions */}
      {showSuggestions && (
        <div style={s.suggestions}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>
            Try asking
          </div>
          {SUGGESTIONS.map((sg, i) => (
            <button key={i} style={sugStyle} onClick={() => send(sg.text)}>
              <span style={{ fontSize: 13 }}>{sg.icon}</span>
              <span>{sg.text}</span>
            </button>
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
    top: 56,
    right: 0,
    bottom: 0,
    width: 380,
    background: "#fff",
    borderLeft: "1px solid #e2e8f0",
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
    marginLeft: "15%",
    wordBreak: "break-word",
  },
  aiBubble: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px 12px 12px 2px",
    padding: "10px 13px",
    marginRight: "5%",
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
  spinner: {
    width: 14,
    height: 14,
    border: "2px solid #e2e8f0",
    borderTopColor: "#1a56db",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  },
  suggestions: {
    padding: "0 14px 10px",
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

const sugStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  width: "100%",
  marginBottom: 4,
};
