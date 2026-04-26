import Link from "next/link";

export default function Home() {
  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 56px)", overflow: "hidden", background: "#f0f4f8" }}>

      {/* Backdrop SVG — subtle civic/city grid */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.18,
          pointerEvents: "none",
        }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 700"
      >
        {/* City skyline silhouette */}
        <g fill="#1a56db">
          {/* Buildings */}
          <rect x="0"   y="480" width="60"  height="220" />
          <rect x="10"  y="420" width="40"  height="60"  />
          <rect x="70"  y="500" width="80"  height="200" />
          <rect x="90"  y="450" width="40"  height="50"  />
          <rect x="160" y="460" width="50"  height="240" />
          <rect x="165" y="380" width="40"  height="80"  />
          <rect x="220" y="490" width="70"  height="210" />
          <rect x="300" y="440" width="90"  height="260" />
          <rect x="315" y="360" width="60"  height="80"  />
          <rect x="340" y="300" width="20"  height="60"  /> {/* antenna */}
          <rect x="400" y="470" width="55"  height="230" />
          <rect x="465" y="510" width="65"  height="190" />
          <rect x="540" y="430" width="100" height="270" />
          <rect x="555" y="340" width="70"  height="90"  />
          <rect x="585" y="270" width="10"  height="70"  /> {/* spire */}
          <rect x="650" y="480" width="60"  height="220" />
          <rect x="720" y="450" width="80"  height="250" />
          <rect x="730" y="370" width="60"  height="80"  />
          <rect x="810" y="500" width="55"  height="200" />
          <rect x="875" y="460" width="70"  height="240" />
          <rect x="885" y="390" width="50"  height="70"  />
          <rect x="955" y="490" width="60"  height="210" />
          <rect x="1025" y="440" width="90" height="260" />
          <rect x="1040" y="360" width="60" height="80"  />
          <rect x="1060" y="300" width="20" height="60"  />
          <rect x="1125" y="470" width="75" height="230" />

          {/* Windows — rows on tall buildings */}
          {[310,330,350,370,390,410].map(y => (
            [305,320,335,350,365].map(x => (
              <rect key={`${x}-${y}`} x={x} y={y} width="7" height="10" opacity="0.35" fill="#fff" />
            ))
          ))}
          {[345,365,385,405].map(y => (
            [545,562,579,596,613].map(x => (
              <rect key={`${x}-${y}`} x={x} y={y} width="7" height="10" opacity="0.35" fill="#fff" />
            ))
          ))}
          {[375,395,415,435].map(y => (
            [1030,1047,1064,1081].map(x => (
              <rect key={`${x}-${y}`} x={x} y={y} width="7" height="10" opacity="0.35" fill="#fff" />
            ))
          ))}
        </g>

        {/* Road grid */}
        <g stroke="#1a56db" strokeWidth="1.5" fill="none" opacity="0.5">
          {/* Horizontal roads */}
          <line x1="0" y1="560" x2="1200" y2="560" />
          <line x1="0" y1="620" x2="1200" y2="620" />
          {/* Vertical roads / intersections */}
          <line x1="150"  y1="560" x2="150"  y2="700" />
          <line x1="380"  y1="560" x2="380"  y2="700" />
          <line x1="600"  y1="560" x2="600"  y2="700" />
          <line x1="820"  y1="560" x2="820"  y2="700" />
          <line x1="1050" y1="560" x2="1050" y2="700" />
        </g>

        {/* Subtle dot grid overlay */}
        <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1.2" fill="#1a56db" opacity="0.4" />
        </pattern>
        <rect x="0" y="0" width="1200" height="480" fill="url(#dots)" />

        {/* Gradient fade at bottom so skyline blends */}
        <defs>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f0f4f8" stopOpacity="0" />
            <stop offset="100%" stopColor="#f0f4f8" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x="0" y="380" width="1200" height="320" fill="url(#fade)" />
      </svg>

      {/* Foreground content */}
      <div style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 56px)",
        padding: "0 24px",
        textAlign: "center",
      }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#e8f0fd",
          border: "1px solid #c3d4f7",
          borderRadius: 20,
          padding: "5px 14px",
          fontSize: 12,
          fontWeight: 600,
          color: "#1a56db",
          letterSpacing: ".04em",
          marginBottom: 20,
          textTransform: "uppercase",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a56db", display: "inline-block" }} />
          AI-Powered Civic Platform
        </div>

        <h1 style={{
          fontSize: "clamp(40px, 6vw, 72px)",
          fontWeight: 800,
          color: "#0f172a",
          letterSpacing: "-1.5px",
          lineHeight: 1.1,
          marginBottom: 16,
        }}>
          Fix Your City.<br />
          <span style={{ color: "#1a56db" }}>Together.</span>
        </h1>

        <p style={{
          fontSize: "clamp(15px, 2vw, 18px)",
          color: "#475569",
          maxWidth: 480,
          lineHeight: 1.65,
          marginBottom: 36,
        }}>
          Report potholes, flooding, streetlights, and more. Our AI triages every report and routes it to the right department — automatically.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/report"
            style={{
              background: "#1a56db",
              color: "#fff",
              padding: "13px 30px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 15,
              boxShadow: "0 4px 14px rgba(26,86,219,.35)",
              letterSpacing: ".01em",
            }}
          >
            Report an Issue
          </Link>
          <Link
            href="/agency"
            style={{
              background: "#fff",
              color: "#1a56db",
              padding: "13px 30px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 15,
              border: "1.5px solid #c3d4f7",
              letterSpacing: ".01em",
            }}
          >
            Manage &amp; Resolve Issues
          </Link>
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex",
          gap: 40,
          marginTop: 56,
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {[
            { value: "AI Triage", label: "Instant routing" },
            { value: "Real-time", label: "Status tracking" },
            { value: "9 Depts", label: "City-wide coverage" },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a56db" }}>{value}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
