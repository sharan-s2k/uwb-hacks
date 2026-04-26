"use client";

import { useCallback, useRef, useState } from "react";
import { Conversation } from "@11labs/client";
import type { ReportResponse } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type TranscriptEntry = { role: "agent" | "user"; text: string };
type FlowState =
  | "idle"
  | "connecting"
  | "active"
  | "agent_speaking"
  | "location"
  | "submitting"
  | "success"
  | "error";

// ── Language config ────────────────────────────────────────────────────────────

interface Language {
  code: string;
  label: string;
  native: string;
  flag: string;
  agentId: string;
}

const LANGUAGES: Language[] = [
  {
    code: "en",
    label: "English",
    native: "English",
    flag: "🇺🇸",
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "",
  },
  {
    code: "es",
    label: "Spanish",
    native: "Español",
    flag: "🇪🇸",
    agentId:
      process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID_ES ??
      process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ??
      "",
  },
  {
    code: "zh",
    label: "Chinese",
    native: "中文",
    flag: "🇨🇳",
    agentId:
      process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID_ZH ??
      process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ??
      "",
  },
  {
    code: "tl",
    label: "Tagalog",
    native: "Tagalog",
    flag: "🇵🇭",
    agentId:
      process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID_TL ??
      process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ??
      "",
  },
  {
    code: "vi",
    label: "Vietnamese",
    native: "Tiếng Việt",
    flag: "🇻🇳",
    agentId:
      process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID_VI ??
      process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ??
      "",
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoiceReporter() {
  const [state, setState] = useState<FlowState>("idle");
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [emergencyVisible, setEmergencyVisible] = useState(true);

  const conversationRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function appendEntry(entry: TranscriptEntry) {
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript([...transcriptRef.current]);
    setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function buildTranscriptText(): string {
    return transcriptRef.current
      .map((e) => `${e.role === "agent" ? "Agent" : "Citizen"}: ${e.text}`)
      .join("\n");
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Start conversation ─────────────────────────────────────────────────────

  const startConversation = useCallback(async () => {
    const agentId = selectedLang.agentId;
    if (!agentId) {
      setErrorMsg(
        `NEXT_PUBLIC_ELEVENLABS_AGENT_ID${selectedLang.code !== "en" ? `_${selectedLang.code.toUpperCase()}` : ""} is not configured — add it to frontend/.env.local.`
      );
      setState("error");
      return;
    }

    setState("connecting");
    transcriptRef.current = [];
    setTranscript([]);

    try {
      const conversation = await Conversation.startSession({
        agentId,
        connectionType: "webrtc",

        onMessage({ message, source }) {
          const role = source === "ai" ? "agent" : "user";
          appendEntry({ role, text: message });
        },

        onModeChange({ mode }) {
          setState(mode === "speaking" ? "agent_speaking" : "active");
        },

        onStatusChange({ status }) {
          if (status === "connected") setState("active");
          if (status === "disconnected") setState("location");
        },

        onError(message) {
          setErrorMsg(typeof message === "string" ? message : "Conversation error");
          setState("error");
        },
      });

      conversationRef.current = conversation;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect to voice agent");
      setState("error");
    }
  }, [selectedLang]);

  // ── End conversation manually ──────────────────────────────────────────────

  const stopConversation = useCallback(async () => {
    await conversationRef.current?.endSession();
    conversationRef.current = null;
    setState("location");
  }, []);

  // ── Submit finalize ────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    const fd = new FormData();
    fd.append("conversation_transcript", buildTranscriptText());
    fd.append("language", selectedLang.code);
    if (photo) fd.append("photo", photo);

    try {
      const res = await fetch(`${API_URL}/api/reports/voice/finalize`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: ReportResponse = await res.json();
      setResult(data);
      setEmergencyVisible(true);
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
      setState("error");
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function reset() {
    setState("idle");
    setTranscript([]);
    transcriptRef.current = [];
    setPhoto(null);
    setPhotoPreview(null);
    setResult(null);
    setErrorMsg("");
    setSelectedLang(LANGUAGES[0]);
  }

  // ── Render: success ────────────────────────────────────────────────────────

  if (state === "success" && result) {
    return (
      <div style={s.card}>
        {result.emergency_flag && emergencyVisible && (
          <EmergencyBanner onDismiss={() => setEmergencyVisible(false)} />
        )}
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ color: "#166534", marginTop: 12 }}>Voice Report Submitted</h2>
          <p style={{ color: "#475569" }}>{result.message}</p>
          <dl style={s.dl}>
            <dt style={s.dt}>Ticket</dt>
            <dd style={s.dd}>{result.ticket.ticket_number}</dd>
            <dt style={s.dt}>Category</dt>
            <dd style={s.dd}>{result.ticket.category.replace(/_/g, " ")}</dd>
            <dt style={s.dt}>Assigned To</dt>
            <dd style={s.dd}>{result.ticket.assigned_agency_name}</dd>
            <dt style={s.dt}>Severity</dt>
            <dd style={s.dd}>{result.ticket.severity}</dd>
          </dl>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 12 }}>
            {result.ticket.citizen_summary}
          </p>
          <button style={s.btnPrimary} onClick={reset}>
            Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  // ── Render: error ──────────────────────────────────────────────────────────

  if (state === "error") {
    return (
      <div style={s.card}>
        <div style={s.errorBanner}>{errorMsg || "Something went wrong."}</div>
        <button style={{ ...s.btnPrimary, marginTop: 16 }} onClick={reset}>
          Try Again
        </button>
      </div>
    );
  }

  // ── Render: photo confirmation ─────────────────────────────────────────────

  if (state === "location") {
    return (
      <div style={s.card}>
        <h2 style={s.heading}>Almost done!</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
          Review the conversation and optionally attach a photo before submitting.
          {selectedLang.code !== "en" && (
            <span style={{ display: "block", marginTop: 4, color: "#1a56db", fontWeight: 500 }}>
              🌐 Your {selectedLang.label} transcript will be translated automatically.
            </span>
          )}
        </p>

        <div style={s.transcriptBox}>
          {transcript.map((e, i) => (
            <TranscriptLine key={i} entry={e} />
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Photo */}
          <div>
            <label style={s.label}>Photo (optional)</label>
            {photoPreview ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{ maxHeight: 180, borderRadius: 8, border: "1px solid #e2e8f0", display: "block" }}
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    cursor: "pointer",
                    fontSize: 13,
                    lineHeight: "24px",
                    textAlign: "center",
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={s.photoZone} onClick={() => fileInputRef.current?.click()}>
                <span style={{ color: "#94a3b8", fontSize: 14 }}>📷 Tap to attach a photo</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
          </div>

          <button type="submit" style={s.btnPrimary}>
            Submit Report
          </button>
          <button type="button" style={s.btnGhost} onClick={reset}>
            Start Over
          </button>
        </form>
      </div>
    );
  }

  // ── Render: submitting ─────────────────────────────────────────────────────

  if (state === "submitting") {
    return (
      <div style={{ ...s.card, textAlign: "center", padding: "48px 32px" }}>
        <Spinner />
        <p style={{ color: "#64748b", marginTop: 16 }}>
          {selectedLang.code !== "en"
            ? `Translating ${selectedLang.label} transcript and routing your report…`
            : "Routing your report…"}
        </p>
      </div>
    );
  }

  // ── Render: idle / connecting / active / agent_speaking ───────────────────

  return (
    <div style={s.card}>
      <h1 style={s.heading}>Voice Issue Report</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
        Speak naturally. Our AI agent will ask you a few questions about the issue, then route
        your report automatically.
      </p>

      {/* Language picker — only shown at idle */}
      {state === "idle" && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ ...s.label, marginBottom: 8 }}>🌐 Choose language</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LANGUAGES.map((lang) => {
              const active = selectedLang.code === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 20,
                    border: `1.5px solid ${active ? "#1a56db" : "#d1d5db"}`,
                    background: active ? "#eff6ff" : "#fff",
                    color: active ? "#1a56db" : "#374151",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.native}</span>
                </button>
              );
            })}
          </div>
          {selectedLang.code !== "en" && (
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
              The agent will converse in {selectedLang.label}. Your transcript will be translated to English before triage.
            </p>
          )}
        </div>
      )}

      <div style={s.transcriptBox}>
        {transcript.length === 0 && state === "idle" && (
          <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "32px 0" }}>
            Transcript will appear here once the conversation starts.
          </p>
        )}
        {transcript.length === 0 && state === "connecting" && (
          <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "32px 0" }}>
            Connecting to {selectedLang.label} voice agent…
          </p>
        )}
        {transcript.map((e, i) => (
          <TranscriptLine key={i} entry={e} />
        ))}
        <div ref={transcriptEndRef} />
      </div>

      {(state === "active" || state === "agent_speaking" || state === "connecting") && (
        <div style={s.statusRow}>
          <PulseDot active={state === "agent_speaking"} />
          <span style={{ fontSize: 13, color: "#64748b" }}>
            {state === "connecting" && `Connecting to ${selectedLang.label} agent…`}
            {state === "agent_speaking" && "Agent speaking — please wait"}
            {state === "active" && `Listening — speak in ${selectedLang.label}`}
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {state === "idle" && (
          <button style={s.btnPrimary} onClick={startConversation}>
            {selectedLang.flag} Start Voice Report in {selectedLang.native}
          </button>
        )}
        {(state === "connecting" || state === "active" || state === "agent_speaking") && (
          <>
            <button style={s.btnDanger} onClick={stopConversation}>
              ⏹ End &amp; Continue
            </button>
            <button style={s.btnGhost} onClick={reset}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
  const isAgent = entry.role === "agent";
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 6px",
          borderRadius: 4,
          background: isAgent ? "#dbeafe" : "#dcfce7",
          color: isAgent ? "#1d4ed8" : "#15803d",
          whiteSpace: "nowrap",
          marginTop: 2,
        }}
      >
        {isAgent ? "Agent" : "You"}
      </span>
      <span style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.5 }}>{entry.text}</span>
    </div>
  );
}

function EmergencyBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={s.emergencyBanner}>
      <strong>⚠️ Emergency Alert:</strong> This issue may require immediate attention. If there
      is immediate danger, please call <strong>911</strong>.
      <button onClick={onDismiss} style={s.dismissBtn}>✕</button>
    </div>
  );
}

function PulseDot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: active ? "#ef4444" : "#22c55e",
        display: "inline-block",
      }}
    />
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        border: "4px solid #e2e8f0",
        borderTop: "4px solid #1a56db",
        borderRadius: "50%",
        margin: "0 auto",
      }}
    />
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "32px 36px",
    boxShadow: "0 1px 6px rgba(0,0,0,.08)",
    maxWidth: 640,
    margin: "0 auto",
  },
  heading: { fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 },
  photoZone: {
    border: "2px dashed #d1d5db",
    borderRadius: 8,
    padding: "20px",
    textAlign: "center",
    cursor: "pointer",
    minHeight: 72,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  transcriptBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "12px 14px",
    minHeight: 160,
    maxHeight: 320,
    overflowY: "auto",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: "8px 12px",
    background: "#f1f5f9",
    borderRadius: 6,
  },
  dl: { textAlign: "left", marginTop: 16 },
  dt: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: ".06em",
  },
  dd: { fontSize: 14, color: "#1e293b", marginLeft: 0, marginBottom: 8 },
  btnPrimary: {
    background: "#1a56db",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 24px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    display: "block",
  },
  btnDanger: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
  btnGhost: {
    background: "transparent",
    color: "#64748b",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "12px 20px",
    fontSize: 14,
    cursor: "pointer",
    flex: 1,
    display: "block",
    width: "100%",
    textAlign: "center",
  },
  errorBanner: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    padding: "12px 16px",
    color: "#b91c1c",
    fontSize: 14,
  },
  emergencyBanner: {
    background: "#fff7ed",
    border: "1px solid #fb923c",
    borderRadius: 8,
    padding: "14px 40px 14px 16px",
    color: "#9a3412",
    fontSize: 14,
    marginBottom: 20,
    position: "relative",
  },
  dismissBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9a3412",
    fontSize: 16,
  },
};
