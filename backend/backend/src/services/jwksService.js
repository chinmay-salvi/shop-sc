/**
 * Google JWKS: fetch OAuth2 certs and compute hashes for JWT-circuit server-side binding.
 * Hashes must match frontend hashToField / modulus hash so proof verification accepts only real Google keys.
 */
const crypto = require("crypto");
const https = require("https");
const { logBasic, logVerbose } = require("../config/logger");

const GOOGLE_JWKS_URL = process.env.GOOGLE_JWKS_URL || "https://www.googleapis.com/oauth2/v3/certs";
const CACHE_TTL_MS = parseInt(process.env.JWKS_CACHE_TTL_MS || "300000", 10); // 5 min

let cache = { data: null, expiresAt: 0 };

/**
 * Same as frontend hashToField: SHA-256(s) -> hex -> first 60 hex -> BigInt -> decimal string.
 */
function hashToFieldString(s) {
  const enc = Buffer.from(String(s), "utf8");
  const hex = crypto.createHash("sha256").update(enc).digest("hex");
  const first60 = hex.slice(0, 60);
  const big = BigInt("0x" + first60);
  return big.toString();
}

/**
 * Hash JWK modulus (n, base64url) for circuit binding. Same canonical form as frontend.
 */
function hashModulusForCircuit(nBase64url) {
  if (!nBase64url || typeof nBase64url !== "string") {
    logVerbose("jwksService.hashModulusForCircuit", { hasN: !!nBase64url });
    return null;
  }
  const enc = Buffer.from(nBase64url, "utf8");
  const hex = crypto.createHash("sha256").update(enc).digest("hex");
  const first60 = hex.slice(0, 60);
  const big = BigInt("0x" + first60);
  return big.toString();
}

/**
 * Fetch Google JWKS and return { keys, fetchedAt }.
 */
function fetchJwks() {
  return new Promise((resolve, reject) => {
    logVerbose("jwksService.fetchJwks.start", { url: GOOGLE_JWKS_URL });
    const req = https.get(GOOGLE_JWKS_URL, (res) => {
      if (res.statusCode !== 200) {
        logBasic("jwksService.fetchJwks.fail", { status: res.statusCode, statusMessage: res.statusMessage });
        reject(new Error("JWKS_FETCH_FAILED"));
        return;
      }
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          const keys = json.keys || [];
          logVerbose("jwksService.fetchJwks.done", { keyCount: keys.length, kids: keys.map((k) => k.kid).filter(Boolean) });
          resolve({ keys, fetchedAt: Date.now() });
        } catch (e) {
          logBasic("jwksService.fetchJwks.parse_error", { message: e.message });
          reject(new Error("JWKS_PARSE_FAILED"));
        }
      });
    });
    req.on("error", (err) => {
      logBasic("jwksService.fetchJwks.error", { message: err.message });
      reject(new Error("JWKS_FETCH_FAILED"));
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("JWKS_FETCH_TIMEOUT"));
    });
  });
}

/**
 * Get cached or fresh JWKS; return list of acceptable googleKeyHash values (one per key).
 */
async function getGoogleKeyHashes() {
  const now = Date.now();
  if (cache.data && cache.expiresAt > now) {
    logVerbose("jwksService.getGoogleKeyHashes.cache_hit", { keyCount: cache.data.googleKeyHashes.length });
    return cache.data;
  }
  logVerbose("jwksService.getGoogleKeyHashes.cache_miss_or_expired", { expiresAt: cache.expiresAt, now });
  const { keys } = await fetchJwks();
  const googleKeyHashes = [];
  for (const k of keys) {
    if (k.n) {
      const h = hashModulusForCircuit(k.n);
      if (h) {
        googleKeyHashes.push(h);
        logVerbose("jwksService.getGoogleKeyHashes.key_hash", { kid: k.kid || "unknown", hashPrefix: h.slice(0, 12) + "…" });
      }
    }
  }
  const expectedAudHash = getExpectedAudHash();
  cache = {
    data: { googleKeyHashes, expectedAudHash, keys },
    expiresAt: now + CACHE_TTL_MS
  };
  logBasic("jwksService.getGoogleKeyHashes.updated", {
    googleKeyHashesCount: googleKeyHashes.length,
    expectedAudHashPrefix: expectedAudHash ? expectedAudHash.slice(0, 12) + "…" : "none"
  });
  return cache.data;
}

/**
 * Server-side expected aud hash from GOOGLE_CLIENT_ID (must match frontend when they use same client ID).
 */
function getExpectedAudHash() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  if (!clientId) {
    logVerbose("jwksService.getExpectedAudHash.no_client_id");
    return "";
  }
  const h = hashToFieldString(clientId);
  logVerbose("jwksService.getExpectedAudHash.computed", { clientIdPrefix: clientId.slice(0, 8) + "…", hashPrefix: h.slice(0, 12) + "…" });
  return h;
}

/**
 * Validate that client-sent publicInputs match server expectations (Google key + audience).
 * Returns { valid: true } or throws with reason.
 */
async function validateServerSideHashes(publicInputs) {
  logVerbose("jwksService.validateServerSideHashes.entry", {
    hasPepper: publicInputs?.pepper != null,
    hasCurrentTime: publicInputs?.currentTime != null,
    hasExpectedAudHash: publicInputs?.expectedAudHash != null,
    hasGoogleKeyHash: publicInputs?.googleKeyHash != null
  });
  const { googleKeyHashes, expectedAudHash } = await getGoogleKeyHashes();

  const clientGoogleKeyHash = String(publicInputs?.googleKeyHash ?? "");
  const clientExpectedAudHash = String(publicInputs?.expectedAudHash ?? "");

  if (!googleKeyHashes.length) {
    logBasic("jwksService.validateServerSideHashes.no_keys", { message: "No Google key hashes from JWKS" });
    throw new Error("JWKS_NO_KEYS");
  }

  const keyHashAllowed = googleKeyHashes.includes(clientGoogleKeyHash);
  logVerbose("jwksService.validateServerSideHashes.key_check", {
    clientHashPrefix: clientGoogleKeyHash.slice(0, 12) + "…",
    allowedCount: googleKeyHashes.length,
    keyHashAllowed
  });
  if (!keyHashAllowed) {
    logBasic("jwksService.validateServerSideHashes.reject", { reason: "GOOGLE_KEY_HASH_MISMATCH" });
    throw new Error("GOOGLE_KEY_HASH_MISMATCH");
  }

  if (expectedAudHash && clientExpectedAudHash !== expectedAudHash) {
    logBasic("jwksService.validateServerSideHashes.reject", {
      reason: "EXPECTED_AUD_HASH_MISMATCH",
      clientPrefix: clientExpectedAudHash.slice(0, 12) + "…",
      serverPrefix: expectedAudHash.slice(0, 12) + "…"
    });
    throw new Error("EXPECTED_AUD_HASH_MISMATCH");
  }

  logVerbose("jwksService.validateServerSideHashes.pass");
  return { valid: true };
}

module.exports = {
  getGoogleKeyHashes,
  getExpectedAudHash,
  fetchJwks,
  hashToFieldString,
  hashModulusForCircuit,
  validateServerSideHashes
};
