type LogMode = "disabled" | "basic" | "verbose";

function getLogMode(): LogMode {
  const mode = import.meta.env?.VITE_LOG_MODE as LogMode;
  return mode || "basic";
}

export function logBasic(event: string, data?: Record<string, unknown>): void {
  const mode = getLogMode();
  if (mode === "disabled") return;
  if (data) {
    console.log(`[shop-sc] ${event}`, data);
  } else {
    console.log(`[shop-sc] ${event}`);
  }
}

export function logVerbose(event: string, data?: Record<string, unknown>): void {
  const mode = getLogMode();
  if (mode !== "verbose") return;
  if (data) {
    console.log(`[shop-sc:verbose] ${event}`, data);
  } else {
    console.log(`[shop-sc:verbose] ${event}`);
  }
}
