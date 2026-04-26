"use client";

import { useState, useRef } from "react";
import type { ReportFormData, ReportResponse } from "@/lib/types";
import { submitReport } from "@/lib/api";

type FormState = "idle" | "loading" | "success" | "error";

export default function ReportForm() {
  const [formData, setFormData] = useState<ReportFormData>({
    description: "",
    location: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "captured" | "denied">("idle");
  const [formState, setFormState] = useState<FormState>("idle");
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Geolocation ──────────────────────────────────────────────────────────
  function captureLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          location: prev.location || `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        }));
        setGeoStatus("captured");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 }
    );
  }

  // ── Photo capture ─────────────────────────────────────────────────────────
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, photo: file }));
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.description.trim() || !formData.location.trim()) return;

    setFormState("loading");
    setErrorMsg("");

    const fd = new FormData();
    fd.append("description", formData.description);
    fd.append("location", formData.location);
    if (formData.latitude !== undefined) fd.append("latitude", String(formData.latitude));
    if (formData.longitude !== undefined) fd.append("longitude", String(formData.longitude));
    if (formData.photo) fd.append("photo", formData.photo);

    try {
      const res = await submitReport(fd);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: ReportResponse = await res.json();
      setResult(data);
      setFormState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
      setFormState("error");
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (formState === "success" && result) {
    return (
      <div style={styles.card}>
        {result.emergency_flag && <EmergencyBanner />}
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ color: "#166534", marginTop: 12 }}>Issue Reported</h2>
          <p style={{ color: "#475569" }}>{result.message}</p>
          <div style={styles.successDetail}>
            <span style={styles.label}>Ticket ID</span>
            <span>{result.ticket.id}</span>
          </div>
          <div style={styles.successDetail}>
            <span style={styles.label}>Category</span>
            <span>{result.ticket.category}</span>
          </div>
          <div style={styles.successDetail}>
            <span style={styles.label}>Assigned To</span>
            <span>{result.ticket.assigned_agency_name}</span>
          </div>
          <div style={styles.successDetail}>
            <span style={styles.label}>Severity</span>
            <span>{result.ticket.severity}</span>
          </div>
          <button style={styles.btnPrimary} onClick={() => { setFormState("idle"); setResult(null); setFormData({ description: "", location: "" }); setPhotoPreview(null); setGeoStatus("idle"); }}>
            Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div style={styles.card}>
      <h1 style={styles.heading}>Report a Civic Issue</h1>
      <p style={styles.subheading}>
        Describe what you see and where. Our AI will route it to the right agency.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Description */}
        <label style={styles.label}>
          What&apos;s the issue? <span style={styles.required}>*</span>
        </label>
        <textarea
          style={styles.textarea}
          placeholder="e.g. Large pothole on Main St near the intersection with 3rd Ave — about 12 inches wide, causing cars to swerve."
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          required
          disabled={formState === "loading"}
        />

        {/* Location */}
        <label style={styles.label}>
          Where is it? <span style={styles.required}>*</span>
        </label>
        <div style={styles.locationRow}>
          <input
            type="text"
            style={{ ...styles.input, flex: 1 }}
            placeholder="Street address or cross streets"
            value={formData.location}
            onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
            required
            disabled={formState === "loading"}
          />
          <button
            type="button"
            style={{
              ...styles.btnSecondary,
              ...(geoStatus === "captured" ? { borderColor: "#16a34a", color: "#16a34a" } : {}),
            }}
            onClick={captureLocation}
            disabled={formState === "loading" || geoStatus === "loading"}
          >
            {geoStatus === "loading" && "Locating…"}
            {geoStatus === "captured" && "📍 GPS Captured"}
            {geoStatus === "idle" && "Use My Location"}
            {geoStatus === "denied" && "Location Denied"}
          </button>
        </div>
        {geoStatus === "captured" && (
          <p style={styles.hint}>
            GPS: {formData.latitude?.toFixed(5)}, {formData.longitude?.toFixed(5)}
          </p>
        )}
        {geoStatus === "denied" && (
          <p style={{ ...styles.hint, color: "#dc2626" }}>
            Location access denied — please type the address above.
          </p>
        )}

        {/* Photo */}
        <label style={styles.label}>Photo (optional)</label>
        <div
          style={styles.photoZone}
          onClick={() => fileInputRef.current?.click()}
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Preview" style={{ maxHeight: 200, borderRadius: 6 }} />
          ) : (
            <span style={{ color: "#94a3b8", fontSize: 14 }}>
              📷 Click to attach a photo
            </span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handlePhotoChange}
          disabled={formState === "loading"}
        />

        {/* Error */}
        {formState === "error" && (
          <div style={styles.errorBanner}>
            {errorMsg || "Something went wrong. Please try again."}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          style={{
            ...styles.btnPrimary,
            opacity: formState === "loading" ? 0.7 : 1,
            cursor: formState === "loading" ? "not-allowed" : "pointer",
          }}
          disabled={formState === "loading"}
        >
          {formState === "loading" ? "Submitting…" : "Submit Report"}
        </button>

        <p style={styles.hint}>
          Your report will be reviewed and routed to the appropriate city agency. Track its status
          under <a href="/dashboard/citizen" style={{ color: "#1a56db" }}>My Issues</a> in the nav bar.
        </p>
      </form>
    </div>
  );
}

function EmergencyBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div style={styles.emergencyBanner}>
      <strong>⚠️ Emergency Alert:</strong> This issue may require immediate attention. If there is
      immediate danger, please call <strong>911</strong>.
      <button onClick={() => setVisible(false)} style={styles.dismissBtn}>
        ✕
      </button>
    </div>
  );
}

// ── Inline styles (no external CSS dependency for skeleton) ─────────────────
const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "32px 36px",
    boxShadow: "0 1px 6px rgba(0,0,0,.08)",
    maxWidth: 640,
    margin: "0 auto",
  },
  heading: { fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  subheading: { color: "#64748b", fontSize: 14, marginBottom: 28 },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151", marginTop: 12 },
  required: { color: "#dc2626" },
  input: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  },
  textarea: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    resize: "vertical",
    fontFamily: "inherit",
    outline: "none",
  },
  locationRow: { display: "flex", gap: 8, alignItems: "stretch" },
  photoZone: {
    border: "2px dashed #d1d5db",
    borderRadius: 8,
    padding: "24px",
    textAlign: "center",
    cursor: "pointer",
    marginTop: 4,
    minHeight: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    background: "#1a56db",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 24px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 16,
    width: "100%",
  },
  btnSecondary: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  hint: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  errorBanner: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    padding: "12px 16px",
    color: "#b91c1c",
    fontSize: 14,
    marginTop: 8,
  },
  emergencyBanner: {
    background: "#fff7ed",
    border: "1px solid #fb923c",
    borderRadius: 8,
    padding: "14px 16px",
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
  successDetail: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 14,
    color: "#374151",
  },
};
