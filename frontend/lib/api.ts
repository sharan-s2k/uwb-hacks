// Empty string = relative URL → works via nginx proxy in monolith and direct in dev with NEXT_PUBLIC_API_URL set
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function submitReport(formData: FormData): Promise<Response> {
  return fetch(`${API_URL}/api/reports/manual`, {
    method: "POST",
    body: formData,
  });
}
