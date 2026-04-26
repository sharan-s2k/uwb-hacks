import Link from "next/link";
import ReportForm from "@/components/ReportForm";

export const metadata = { title: "Report an Issue — CivicFix" };

export default function ReportPage() {
  return (
    <>
      <ReportForm />
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#64748b" }}>
        Prefer to speak?{" "}
        <Link href="/report/voice" style={{ color: "#1a56db" }}>
          Use voice reporting instead →
        </Link>
      </p>
    </>
  );
}
