/**
 * Configurable logging: disabled | basic | verbose
 * Set NEXT_PUBLIC_LOG_MODE in .env.local (default: basic)
 * Safe for SSR: only logs in browser when mode allows.
 */
const MODES = ["disabled", "basic", "verbose"];

function getMode() {
  if (typeof window === "undefined") return "disabled";
  const raw = process.env.NEXT_PUBLIC_LOG_MODE || "basic";
  const mode = String(raw).toLowerCase();
  return MODES.includes(mode) ? mode : "basic";
}

function isEnabled(minLevel) {
  const order = { disabled: 0, basic: 1, verbose: 2 };
  return order[getMode()] >= order[minLevel];
}

function formatData(data) {
  if (data === undefined) return "";
  if (typeof data !== "object") return ` ${data}`;
  try {
    return " " + JSON.stringify(data);
  } catch {
    return " [object]";
  }
}

export function logBasic(message, data) {
  if (typeof window !== "undefined" && isEnabled("basic")) {
    console.log(`[basic] ${message}${formatData(data)}`);
  }
}

export function logVerbose(message, data) {
  if (typeof window !== "undefined" && isEnabled("verbose")) {
    console.log(`[verbose] ${message}${formatData(data)}`);
  }
}

export { getMode, isEnabled };
