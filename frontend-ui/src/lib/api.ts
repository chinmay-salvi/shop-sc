import { logBasic, logVerbose } from "./logger";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:4000/api";

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("sessionJwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const method = ((options.method || "GET") as string).toUpperCase();
  const url = `${API_BASE}${path}`;
  logBasic("api.fetch", { method, path });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  const start = performance.now();
  const response = await fetch(url, { ...options, headers });
  const duration = Math.round(performance.now() - start);
  logVerbose("api.fetch response", { path, status: response.status, durationMs: duration });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    logBasic("api.fetch error", { path, status: response.status, error: payload.error });
    const error = new Error(payload.error || `API_ERROR_${response.status}`);
    throw error;
  }

  if (response.status === 204) return null;
  const data = await response.json();
  logVerbose("api.fetch ok", { path, responseKeys: typeof data === "object" && data !== null ? Object.keys(data as object) : [] });
  return data;
}
