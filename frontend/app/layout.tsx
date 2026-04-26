import type { Metadata } from "next";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "CivicFix",
  description: "Report and track local civic issues",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
        <NavBar />
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
