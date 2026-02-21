import { logBasic, logVerbose } from "./logger";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("sessionJwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const url = `${API_BASE}${path}`;
  logBasic("api.fetch", { method, path });
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options.headers || {})
  };
  const start = typeof performance !== "undefined" ? performance.now() : 0;
  const response = await fetch(url, {
    ...options,
    headers
  });
  const duration = typeof performance !== "undefined" ? Math.round(performance.now() - start) : 0;
  logVerbose("api.fetch response", { path, status: response.status, durationMs: duration });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    logBasic("api.fetch error", { path, status: response.status, error: payload.error });
    const error = new Error(payload.error || `API_ERROR_${response.status}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  const data = await response.json();
  logVerbose("api.fetch ok", { path, responseKeys: typeof data === "object" && data !== null ? Object.keys(data) : [] });
  return data;
}
