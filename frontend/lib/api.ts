// Empty string = relative URL → works via nginx proxy in monolith and direct in dev with NEXT_PUBLIC_API_URL set
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function isLocalDev(): boolean {
  return typeof window !== "undefined" && window.location.hostname === "localhost";
}

export async function fetchJsonWithFallback<T>(path: string): Promise<T> {
  const endpoint = `${API_URL}${path}`;
  const response = await fetch(endpoint);

  if (
    !API_URL &&
    response.status === 404 &&
    isLocalDev()
  ) {
    const fallback = await fetch(`http://localhost:8080${path}`);
    if (!fallback.ok) {
      throw new Error(`Error ${fallback.status}`);
    }
    return fallback.json() as Promise<T>;
  }

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function patchJsonWithFallback(
  path: string,
  body: unknown
): Promise<Response> {
  const endpoint = `${API_URL}${path}`;
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (
    !API_URL &&
    response.status === 404 &&
    isLocalDev()
  ) {
    return fetch(`http://localhost:8080${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return response;
}

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
    isLocalDev()
  ) {
    return fetch("http://localhost:8080/api/reports/manual", {
      method: "POST",
      body: formData,
    });
  }

  return response;
}
