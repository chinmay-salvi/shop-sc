/**
 * Configurable logging: disabled | basic | verbose
 * Set LOG_MODE in .env (default: basic)
 */
const MODES = ["disabled", "basic", "verbose"];
const mode = (process.env.LOG_MODE || "basic").toLowerCase();
const level = MODES.includes(mode) ? mode : "basic";

function isEnabled(minLevel) {
  const order = { disabled: 0, basic: 1, verbose: 2 };
  return order[level] >= order[minLevel];
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

function logBasic(message, data) {
  if (isEnabled("basic")) {
    console.log(`[basic] ${message}${formatData(data)}`);
  }
}

function logVerbose(message, data) {
  if (isEnabled("verbose")) {
    console.log(`[verbose] ${message}${formatData(data)}`);
  }
}

function requestLogger(req, res, next) {
  if (!isEnabled("basic")) return next();
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;
  res.on("finish", () => {
    const duration = Date.now() - start;
    logBasic("request", { method, url, status: res.statusCode, durationMs: duration });
    if (isEnabled("verbose")) {
      const bodyKeys = req.body && typeof req.body === "object" ? Object.keys(req.body) : [];
      if (bodyKeys.length) logVerbose("request body keys (no values)", bodyKeys);
    }
  });
  next();
}

module.exports = {
  level,
  isEnabled,
  logBasic,
  logVerbose,
  requestLogger
};
