// Empty string = relative URL → works via nginx proxy in monolith and direct in dev with NEXT_PUBLIC_API_URL set
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function submitReport(formData: FormData): Promise<Response> {
  const endpoint = `${API_URL}/api/reports/manual`;
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  // Local-dev fallback: if frontend is running on :3000 and backend is on :8080,
  // a relative /api request can 404 from Next.js. Retry against monolith API.
  if (
    !API_URL &&
    response.status === 404 &&
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    return fetch("http://localhost:8080/api/reports/manual", {
      method: "POST",
      body: formData,
    });
  }

  return response;
}
