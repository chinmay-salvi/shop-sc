// CLIENT-SIDE PROOF GENERATION (runs in browser)
//
// CONTRACT (ZK auth): The production login path must NEVER send the raw Google id_token
// to the backend. The JWT is used only client-side as input to the ZK circuit; the backend
// receives only the zk-SNARK proof and public inputs/outputs. See docs/zk-auth-architecture.md.
import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import sharedConstants from "../../shared/constants";
import { apiFetch } from "./api";
import { saveToken } from "./auth";
import { logBasic, logVerbose } from "./logger";

const { EXTERNAL_NULLIFIER, ACCESS_SIGNAL, STABLE_ID_DOMAIN, ZKP_APP_PEPPER } = sharedConstants;

/** When true, use JWT ZK proof flow (no idToken sent to backend). When false, use legacy enroll + Semaphore proof. */
export const USE_JWT_ZK_LOGIN = typeof process.env.NEXT_PUBLIC_USE_JWT_ZK_LOGIN !== "undefined" && process.env.NEXT_PUBLIC_USE_JWT_ZK_LOGIN === "true";

/** Derive a stable pseudonymous ID from this identity's commitment. Same identity → same id across sessions. */
export async function getStablePseudonym() {
  logVerbose("zkp.getStablePseudonym");
  if (typeof window === "undefined") throw new Error("NOT_ENROLLED");
  const identityJSON = localStorage.getItem("semaphoreIdentity");
  if (!identityJSON) throw new Error("NOT_ENROLLED");
  const identity = Identity.import(identityJSON);
  const commitment = identity.commitment.toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(commitment + ":" + STABLE_ID_DOMAIN);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const stableId = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  logVerbose("zkp.getStablePseudonym done", { stableIdPrefix: stableId.slice(0, 8) + "…" });
  return stableId;
}

// Generate identity AFTER email verification (store securely). Overwrites any existing identity.
export function createIdentity() {
  logBasic("zkp.createIdentity");
  if (typeof window === "undefined") throw new Error("BROWSER_ONLY");
  const identity = new Identity(); // Creates EdDSA keypair
  localStorage.setItem("semaphoreIdentity", identity.export());
  const commitment = identity.commitment.toString();
  logVerbose("zkp.createIdentity done", { commitmentPrefix: commitment.slice(0, 12) + "…" });
  return commitment;
}

/**
 * Use existing identity if present, otherwise create one. Ensures same device = same stableId
 * across sessions so "My listings" and edit/delete keep working after re-enroll or refresh.
 */
function getOrCreateIdentityCommitment() {
  if (typeof window === "undefined") throw new Error("BROWSER_ONLY");
  const existing = localStorage.getItem("semaphoreIdentity");
  if (existing) {
    logVerbose("zkp.getOrCreateIdentity using existing identity");
    const identity = Identity.import(existing);
    return identity.commitment.toString();
  }
  return createIdentity();
}

/** Enroll with Google ID token. LEGACY: sends idToken to backend for hd=usc.edu check. Do not use for ZK path (USE_JWT_ZK_LOGIN). */
export async function enrollWithGoogle(idToken) {
  logBasic("zkp.enrollWithGoogle");
  const identityCommitment = getOrCreateIdentityCommitment();
  logVerbose("zkp.enrollWithGoogle posting", { hasIdToken: !!idToken });
  const result = await apiFetch("/auth/enroll", {
    method: "POST",
    body: JSON.stringify({ idToken, identityCommitment })
  });
  logBasic("zkp.enrollWithGoogle success", { enrolled: result.enrolled });
  return result;
}

/** Dev fallback: enroll with email suffix check (backend still does not store email). */
export async function enrollWithEmail(email) {
  logBasic("zkp.enrollWithEmail", { emailSuffix: email ? "…" + email.slice(-10) : "" });
  const identityCommitment = getOrCreateIdentityCommitment();
  const result = await apiFetch("/auth/enroll", {
    method: "POST",
    body: JSON.stringify({ email, identityCommitment })
  });
  logBasic("zkp.enrollWithEmail success", { enrolled: result.enrolled });
  return result;
}

// Generate access proof (call before protected routes)
export async function generateAccessProof() {
  logBasic("zkp.generateAccessProof started");
  if (typeof window === "undefined") throw new Error("NOT_ENROLLED");
  // 1. Load identity
  const identityJSON = localStorage.getItem("semaphoreIdentity");
  if (!identityJSON) throw new Error("NOT_ENROLLED");
  const identity = Identity.import(identityJSON);
  logVerbose("zkp.generateAccessProof identity loaded");

  // 2. Get full group (commitments + depth) so we can build Group and generate proof
  const { commitments, depth } = await apiFetch("/group");
  logVerbose("zkp.generateAccessProof group fetched", { count: commitments?.length, depth });
  const group = new Group(commitments.map((c) => BigInt(c)));
  const merkleTreeRoot = group.root.toString();

  // 3. Generate proof: (identity, group, message, scope, merkleTreeDepth?)
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const proof = await generateProof(
    identity,
    group,
    ACCESS_SIGNAL,
    EXTERNAL_NULLIFIER,
    depth ?? 20
  );
  const duration = typeof performance !== "undefined" ? Math.round(performance.now() - t0) : 0;
  logBasic("zkp.generateAccessProof done", { durationMs: duration });

  return proof; // Send to /api/auth/verify-proof (has merkleTreeRoot, nullifier, message, scope, points, merkleTreeDepth)
}

// Helper: Check if enrolled (safe for SSR: no localStorage on server)
export const isEnrolled = () =>
  typeof window !== "undefined" && !!localStorage.getItem("semaphoreIdentity");

const RECOVERY_SALT = "shop-sc-identity-recovery-v1";
const RECOVERY_KEY_PREFIX = "shop-sc-recovery-key-";

async function keyHashFromPassword(password) {
  const data = new TextEncoder().encode(RECOVERY_KEY_PREFIX + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function keyFromPassword(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(RECOVERY_SALT),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptIdentity(identityJson, password) {
  const key = await keyFromPassword(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(identityJson);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptIdentity(encryptedBase64, password) {
  const key = await keyFromPassword(password);
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const dec = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );
  return new TextDecoder().decode(dec);
}

/** Back up current identity to server so you can recover it in another session/device. Call after enroll. */
export async function backupIdentityWithPassword(password) {
  if (typeof window === "undefined") throw new Error("BROWSER_ONLY");
  const identityJSON = localStorage.getItem("semaphoreIdentity");
  if (!identityJSON) throw new Error("NOT_ENROLLED");
  const keyHash = await keyHashFromPassword(password);
  const encrypted = await encryptIdentity(identityJSON, password);
  await apiFetch("/auth/backup-identity", {
    method: "POST",
    body: JSON.stringify({ keyHash, encryptedIdentity: encrypted })
  });
}

/** Recover identity from server using your recovery password. Use when you have no identity (e.g. new session/device). */
export async function recoverIdentityWithPassword(password) {
  if (typeof window === "undefined") throw new Error("BROWSER_ONLY");
  const keyHash = await keyHashFromPassword(password);
  const res = await apiFetch("/auth/recover-identity", {
    method: "POST",
    body: JSON.stringify({ keyHash })
  });
  const identityJSON = await decryptIdentity(res.encryptedIdentity, password);
  localStorage.setItem("semaphoreIdentity", identityJSON);
}

export async function verifyProofAndCreateSession() {
  if (USE_JWT_ZK_LOGIN) {
    throw new Error("Use loginWithJwtZk(idToken) when NEXT_PUBLIC_USE_JWT_ZK_LOGIN is set; do not call verifyProofAndCreateSession.");
  }
  logBasic("zkp.verifyProofAndCreateSession started");
  const proof = await generateAccessProof();
  const stableId = await getStablePseudonym();
  logVerbose("zkp.verifyProofAndCreateSession posting verify-proof");
  const response = await apiFetch("/auth/verify-proof", {
    method: "POST",
    body: JSON.stringify({ ...proof, stableId })
  });
  saveToken(response.token);
  logBasic("zkp.verifyProofAndCreateSession success", { hasToken: !!response.token });
  return response;
}

// --- JWT ZK login path (no idToken sent to backend) ---

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

/** Decode JWT header (no verification). Used to get kid for JWKS lookup. */
export function parseJwtHeader(idToken) {
  const parts = idToken.split(".");
  if (parts.length < 1) throw new Error("INVALID_JWT_FORMAT");
  const headerBase64 = parts[0].replace(/-/g, "+").replace(/_/g, "/");
  const json = typeof atob !== "undefined" ? atob(headerBase64) : Buffer.from(headerBase64, "base64").toString("utf8");
  return JSON.parse(json);
}

/** Decode JWT payload (no verification; verification is done in-circuit or client-side before proving). */
export function parseJwtPayload(idToken) {
  logVerbose("zkp.parseJwtPayload.entry", { tokenPartCount: idToken.split(".").length });
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("INVALID_JWT_FORMAT");
  const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = typeof atob !== "undefined" ? atob(payloadBase64) : Buffer.from(payloadBase64, "base64").toString("utf8");
  const payload = JSON.parse(json);
  logVerbose("zkp.parseJwtPayload.done", { hasAud: "aud" in payload, hasExp: "exp" in payload, hasSub: "sub" in payload, hasEmail: "email" in payload });
  return payload;
}

/** Deterministic string -> field element (decimal string) for aud/expectedAud hashing. Same string => same value. */
export async function hashToField(s) {
  logVerbose("zkp.hashToField.entry", { inputLen: String(s).length });
  const enc = new TextEncoder().encode(String(s));
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const big = BigInt("0x" + hex.slice(0, 60));
  const out = big.toString();
  logVerbose("zkp.hashToField.done", { outputLen: out.length });
  return out;
}

/** Hash JWK modulus (n base64url) for circuit. Must match backend jwksService.hashModulusForCircuit. */
async function hashModulusForCircuit(nBase64url) {
  if (!nBase64url || typeof nBase64url !== "string") return null;
  const enc = new TextEncoder().encode(nBase64url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const big = BigInt("0x" + hex.slice(0, 60));
  return big.toString();
}

/** BigInt to k limbs of n bits each (little-endian). Same as circom-rsa-verify test. Returns string[] for circuit. */
function bigintToLimbs(nBits, k, x) {
  let mod = 1n;
  for (let idx = 0; idx < nBits; idx++) mod *= 2n;
  const ret = [];
  let xTemp = BigInt(x);
  for (let idx = 0; idx < k; idx++) {
    ret.push(String(xTemp % mod));
    xTemp = xTemp / mod;
  }
  return ret;
}

/** Base64url decode to Uint8Array. */
function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
  const binary = (typeof atob !== "undefined" ? atob(base64 + pad) : Buffer.from(base64 + pad, "base64").toString("binary"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Bytes (big-endian) to BigInt. */
function bytesToBigInt(bytes) {
  let x = 0n;
  for (let i = 0; i < bytes.length; i++) x = x * 256n + BigInt(bytes[i]);
  return x;
}

/** SHA-256 of message string (UTF-8), return as 256-bit BigInt (big-endian). */
async function sha256ToBigInt(messageStr) {
  const enc = new TextEncoder().encode(messageStr);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(hashBuffer);
  return bytesToBigInt(Array.from(bytes));
}

/** Fetch full JWKS and return key { n, e } by kid (n,e as base64url). */
async function fetchJwksKeyByKid(kid) {
  logVerbose("zkp.fetchJwksKeyByKid.entry", { kid: kid || "none" });
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) return null;
  const json = await res.json();
  const keys = json.keys || [];
  const key = kid ? keys.find((k) => k.kid === kid) : keys[0];
  if (!key || !key.n) return null;
  return { n: key.n, e: key.e || "AQAB" };
}

/** Fetch Google JWKS and return key hash for given kid (or first key if kid not found). */
async function fetchGoogleKeyHashForKid(kid) {
  logVerbose("zkp.fetchGoogleKeyHashForKid.entry", { kid: kid || "none" });
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) {
    logBasic("zkp.fetchGoogleKeyHashForKid.fail", { status: res.status });
    return null;
  }
  const json = await res.json();
  const keys = json.keys || [];
  logVerbose("zkp.fetchGoogleKeyHashForKid.jwks", { keyCount: keys.length, kids: keys.map((k) => k.kid).filter(Boolean) });
  const key = kid ? keys.find((k) => k.kid === kid) : keys[0];
  if (!key || !key.n) {
    logBasic("zkp.fetchGoogleKeyHashForKid.no_key", { kid });
    return null;
  }
  const hash = await hashModulusForCircuit(key.n);
  logVerbose("zkp.fetchGoogleKeyHashForKid.done", { kid: key.kid, hashPrefix: hash ? hash.slice(0, 12) + "…" : "null" });
  return hash;
}

/**
 * Build public inputs, public outputs, and full circuit input for the JWT circuit.
 * Computes audHash, expectedAudHash, and googleKeyHash (from JWKS by JWT kid) when not provided.
 */
export async function buildJwtCircuitInput(idToken, options = {}) {
  logVerbose("zkp.buildJwtCircuitInput.entry");
  const payload = parseJwtPayload(idToken);
  const pepperRaw = options.pepper ?? ZKP_APP_PEPPER;
  logVerbose("zkp.buildJwtCircuitInput.pepper");
  const pepper = options.pepperField ?? (await hashToField(pepperRaw));
  const currentTime = options.currentTime ?? Math.floor(Date.now() / 1000);
  const googleClientId = options.googleClientId ?? (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) ?? "";
  logVerbose("zkp.buildJwtCircuitInput.expectedAudHash", { clientIdLen: googleClientId.length });
  const expectedAudHash = options.expectedAudHash ?? (googleClientId ? await hashToField(googleClientId) : "0");
  const aud = payload.aud ?? "";
  const audHash = options.audHash ?? (aud ? await hashToField(aud) : "0");
  let googleKeyHash = options.googleKeyHash;
  if (googleKeyHash == null || googleKeyHash === "0") {
    const header = parseJwtHeader(idToken);
    const kid = header.kid || null;
    googleKeyHash = (await fetchGoogleKeyHashForKid(kid)) || "0";
    logVerbose("zkp.buildJwtCircuitInput.googleKeyHash_from_jwks", { kid, hashPrefix: googleKeyHash?.slice(0, 12) + "…" });
  }

  const sub = String(payload.sub ?? "0");
  const exp = String(payload.exp ?? 0);
  // In-circuit @usc.edu: last 8 bytes of email (ASCII); circuit constrains they equal "@usc.edu"
  const email = payload.email || "";
  if (!email.toLowerCase().endsWith("@usc.edu") || email.length < 8) {
    throw new Error("EMAIL_MUST_END_WITH_USC_EDU");
  }
  const suffixStr = email.slice(-8);
  const emailSuffix = Array.from(suffixStr).map((c) => String(c.charCodeAt(0)));

  // RSA-in-circuit: JWT message = header.payload (base64url parts), signature = 3rd part
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("JWT must have 3 parts");
  const messageStr = parts[0] + "." + parts[1];
  const hashBigInt = await sha256ToBigInt(messageStr);
  const hashed = bigintToLimbs(64, 4, hashBigInt);
  const signBytes = base64UrlDecode(parts[2]);
  const signBigInt = bytesToBigInt(Array.from(signBytes));
  const sign = bigintToLimbs(64, 32, signBigInt);

  const header = parseJwtHeader(idToken);
  const kid = header.kid || null;
  const jwksKey = await fetchJwksKeyByKid(kid);
  if (!jwksKey) throw new Error("JWKS key not found for kid");
  const nBytes = base64UrlDecode(jwksKey.n);
  const nBigInt = bytesToBigInt(Array.from(nBytes));
  const modulus = bigintToLimbs(64, 32, nBigInt);
  const eBytes = base64UrlDecode(jwksKey.e);
  const eBigInt = bytesToBigInt(Array.from(eBytes));
  const expRsa = bigintToLimbs(64, 32, eBigInt);

  logVerbose("zkp.buildJwtCircuitInput.done", {
    pepperLen: pepper.length,
    expectedAudHashLen: expectedAudHash.length,
    googleKeyHashLen: googleKeyHash.length,
    currentTime,
    emailSuffixLen: emailSuffix.length,
    hasModulus: modulus.length === 32,
    hasSign: sign.length === 32,
    hasHashed: hashed.length === 4
  });
  return {
    pepper,
    currentTime: String(currentTime),
    expectedAudHash,
    googleKeyHash,
    sub,
    exp,
    audHash,
    emailSuffix,
    modulus,
    expRsa,
    sign,
    hashed
  };
}

/**
 * Build public inputs and public outputs for the JWT circuit (for API payload; nullifier comes from proof).
 */
export function buildJwtCircuitPublicInputsOutputs(idToken, options = {}) {
  const payload = parseJwtPayload(idToken);
  const pepper = options.pepper ?? ZKP_APP_PEPPER;
  const currentTime = options.currentTime ?? Math.floor(Date.now() / 1000);
  const expectedAudHash = options.expectedAudHash ?? "0";
  const googleKeyHash = options.googleKeyHash ?? "0";

  return {
    publicInputs: { pepper, currentTime: String(currentTime), expectedAudHash, googleKeyHash },
    publicOutputs: { nullifier: options.nullifier ?? "0" },
    privateInputs: {
      sub: String(payload.sub ?? "0"),
      exp: String(payload.exp ?? 0),
      audHash: options.audHash ?? "0",
      emailSuffix: (() => {
        const e = payload.email || "";
        const s = e.toLowerCase().endsWith("@usc.edu") && e.length >= 8 ? e.slice(-8) : "@usc.edu";
        return Array.from(s).map((c) => String(c.charCodeAt(0)));
      })(),
      signatureValid: "1"
    }
  };
}

/** Convert snarkjs proof to JSON-safe shape (all numbers as strings) for POST body. */
function toJsonSafeProof(proof) {
  if (!proof || typeof proof !== "object") return {};
  const str = (x) => (x != null && typeof x !== "object" ? String(x) : x);
  const arr = (a) => (Array.isArray(a) ? a.map(str) : a != null && typeof a === "object" ? [str(a[0]), str(a[1])] : []);
  const piA = proof.pi_a != null ? arr(Array.isArray(proof.pi_a) ? proof.pi_a : [proof.pi_a?.[0], proof.pi_a?.[1]]) : [];
  const piC = proof.pi_c != null ? arr(Array.isArray(proof.pi_c) ? proof.pi_c : [proof.pi_c?.[0], proof.pi_c?.[1]]) : [];
  let piB = proof.pi_b;
  if (piB != null && Array.isArray(piB)) {
    piB = piB.map((row) => (Array.isArray(row) ? row.map(str) : [str(row?.[0]), str(row?.[1])]));
  } else if (piB != null && typeof piB === "object") {
    piB = [[str(piB[0]?.[0]), str(piB[0]?.[1])], [str(piB[1]?.[0]), str(piB[1]?.[1])]];
  } else {
    piB = [];
  }
  return { pi_a: piA, pi_b: piB, pi_c: piC };
}

/**
 * Login with JWT ZK: use idToken only in browser to generate proof, then POST proof + public I/O to verify-proof.
 * CONTRACT: idToken is never sent to backend; it is discarded after proof generation (no PII in payload).
 */
export async function loginWithJwtZk(idToken) {
  logBasic("zkp.loginWithJwtZk started");
  logVerbose("zkp.loginWithJwtZk.contract", { message: "JWT used only client-side; will not be sent to backend" });
  if (!USE_JWT_ZK_LOGIN) {
    throw new Error("NEXT_PUBLIC_USE_JWT_ZK_LOGIN must be true to use JWT ZK login.");
  }

  logVerbose("zkp.loginWithJwtZk.generate_proof.entry");
  const { proof: proofResult, error: proofError } = await generateJwtCircuitProofIfAvailable(idToken);
  logVerbose("zkp.loginWithJwtZk.generate_proof.done", { hasResult: !!proofResult, hasError: !!proofError });
  if (!proofResult) {
    const hint = proofError
      ? `Proof failed: ${proofError}`
      : "JWT ZK proof not available. Run: cd circuits && npm run build && npm run setup && npm run copy-to-frontend, then reload.";
    logBasic("zkp.loginWithJwtZk.reject", { reason: "proof_failed", hint: hint.slice(0, 80) + "…" });
    throw new Error(hint);
  }
  logBasic("zkp.loginWithJwtZk.proofResult", {
    hasProof: !!proofResult.proof,
    proofKeys: proofResult.proof ? Object.keys(proofResult.proof) : [],
    hasPublicInputs: !!proofResult.publicInputs,
    publicInputsKeys: proofResult.publicInputs ? Object.keys(proofResult.publicInputs) : [],
    hasPublicOutputs: !!proofResult.publicOutputs,
    hasNullifier: !!proofResult.publicOutputs?.nullifier
  });
  logVerbose("zkp.loginWithJwtZk.idToken_discarded", { message: "JWT retained only in closure until request sent; no PII in payload" });

  // Snarkjs proof may be at proofResult.proof.proof (wrapper) or proofResult.proof (browser sometimes returns flat)
  const rawProof = proofResult.proof?.proof !== undefined ? proofResult.proof.proof : proofResult.proof;
  const publicInputs = proofResult.publicInputs ?? proofResult.proof?.publicInputs;
  const publicOutputs = proofResult.publicOutputs ?? proofResult.proof?.publicOutputs;
  logVerbose("zkp.loginWithJwtZk.rawProof", {
    hasRawProof: !!rawProof,
    rawProofKeys: rawProof && typeof rawProof === "object" ? Object.keys(rawProof) : [],
    pi_aType: rawProof?.pi_a == null ? "null" : Array.isArray(rawProof.pi_a) ? "array" : typeof rawProof.pi_a,
    pi_bType: rawProof?.pi_b == null ? "null" : Array.isArray(rawProof.pi_b) ? "array" : typeof rawProof.pi_b,
    pi_cType: rawProof?.pi_c == null ? "null" : Array.isArray(rawProof.pi_c) ? "array" : typeof rawProof.pi_c
  });

  const proofForApi = toJsonSafeProof(rawProof);
  logVerbose("zkp.loginWithJwtZk.proofForApi", {
    proofForApiKeys: Object.keys(proofForApi),
    pi_aLen: Array.isArray(proofForApi.pi_a) ? proofForApi.pi_a.length : 0,
    pi_bLen: Array.isArray(proofForApi.pi_b) ? proofForApi.pi_b.length : 0,
    pi_cLen: Array.isArray(proofForApi.pi_c) ? proofForApi.pi_c.length : 0,
    pi_aFirstLen: proofForApi.pi_a?.[0]?.length,
    pi_bNested: Array.isArray(proofForApi.pi_b) && proofForApi.pi_b[0] ? proofForApi.pi_b[0].length : undefined
  });

  const payload = {
    proof: proofForApi,
    publicInputs: {
      pepper: String(publicInputs?.pepper ?? ""),
      currentTime: String(publicInputs?.currentTime ?? ""),
      expectedAudHash: String(publicInputs?.expectedAudHash ?? ""),
      googleKeyHash: String(publicInputs?.googleKeyHash ?? "")
    },
    publicOutputs: { nullifier: String(publicOutputs?.nullifier ?? "") }
  };
  if (Array.isArray(publicInputs?.modulus) && publicInputs.modulus.length === 32 && Array.isArray(publicInputs?.expRsa) && publicInputs.expRsa.length === 32) {
    payload.publicInputs.modulus = publicInputs.modulus.map(String);
    payload.publicInputs.expRsa = publicInputs.expRsa.map(String);
  }
  logBasic("zkp.loginWithJwtZk.sendPayload", {
    payloadKeys: Object.keys(payload),
    proofKeys: Object.keys(payload.proof),
    publicInputsKeys: Object.keys(payload.publicInputs),
    publicOutputsKeys: Object.keys(payload.publicOutputs),
    nullifierLen: payload.publicOutputs.nullifier?.length,
    currentTime: payload.publicInputs.currentTime
  });
  logVerbose("zkp.loginWithJwtZk.post.entry", { url: "/auth/verify-proof", method: "POST" });
  const response = await apiFetch("/auth/verify-proof", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  logVerbose("zkp.loginWithJwtZk.post.done", { hasToken: !!response?.token });
  saveToken(response.token);
  logBasic("zkp.loginWithJwtZk success", { hasToken: !!response.token });
  logVerbose("zkp.loginWithJwtZk.session_saved");
  return response;
}

const ZKP_WASM_URL = "/zkp/jwt_usc_main_js/jwt_usc_main.wasm";
const ZKP_ZKEY_URL = "/zkp/jwt_usc_main_final.zkey";

/**
 * If circuit artifacts are present, generate Groth16 proof in the browser.
 * Returns { proof } on success, { proof: null, error } on failure.
 */
async function generateJwtCircuitProofIfAvailable(idToken) {
  logVerbose("zkp.generateJwtCircuitProofIfAvailable.entry");
  if (typeof window === "undefined") {
    logVerbose("zkp.generateJwtCircuitProofIfAvailable.reject", { reason: "not_browser" });
    return { proof: null, error: "Not in browser" };
  }

  try {
    logVerbose("zkp.generateJwtCircuitProofIfAvailable.build_input.entry");
    const input = await buildJwtCircuitInput(idToken);
    logVerbose("zkp.generateJwtCircuitProofIfAvailable.build_input.done", { inputKeys: Object.keys(input) });

    logVerbose("zkp.generateJwtCircuitProofIfAvailable.check_artifacts.entry", { zkeyUrl: ZKP_ZKEY_URL });
    const res = await fetch(ZKP_ZKEY_URL, { method: "HEAD" });
    if (!res.ok) {
      logBasic("zkp.generateJwtCircuitProofIfAvailable.reject", { reason: "artifacts_missing", status: res.status });
      return { proof: null, error: `Circuit artifacts not found (${res.status}). Run: cd circuits && npm run copy-to-frontend` };
    }
    logVerbose("zkp.generateJwtCircuitProofIfAvailable.check_artifacts.ok");

    logVerbose("zkp.generateJwtCircuitProofIfAvailable.snarkjs_import.entry");
    const snarkjs = await import("snarkjs");
    const wasmUrl = window.location.origin + ZKP_WASM_URL;
    const zkeyUrl = window.location.origin + ZKP_ZKEY_URL;
    logVerbose("zkp.generateJwtCircuitProofIfAvailable.fullProve.entry", { wasmUrl, zkeyUrl });

    const proofStart = typeof performance !== "undefined" ? performance.now() : 0;
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmUrl, zkeyUrl);
    const proofMs = typeof performance !== "undefined" ? Math.round(performance.now() - proofStart) : 0;
    logBasic("zkp.generateJwtCircuitProof done", { proofTimeMs: proofMs });
    logVerbose("zkp.generateJwtCircuitProofIfAvailable.fullProve.done", { publicSignalsLen: publicSignals?.length });

    if (!proof || !Array.isArray(publicSignals) || publicSignals.length < 1) {
      logBasic("zkp.generateJwtCircuitProofIfAvailable.reject", { reason: "invalid_output", publicSignalsLen: publicSignals?.length ?? 0 });
      return { proof: null, error: `Invalid proof output (got ${publicSignals?.length ?? 0} public signals)` };
    }

    // RSA circuit: 69 public signals [pepper, currentTime, expectedAudHash, googleKeyHash, modulus[0..31], expRsa[0..31], nullifier]
    const nullifier = String(publicSignals[publicSignals.length - 1]);
    logVerbose("zkp.generateJwtCircuitProofIfAvailable.success", { nullifierPrefix: nullifier.slice(0, 12) + "…", nPublic: publicSignals.length });
    const publicInputs = {
      pepper: input.pepper,
      currentTime: input.currentTime,
      expectedAudHash: input.expectedAudHash,
      googleKeyHash: input.googleKeyHash
    };
    if (Array.isArray(input.modulus) && input.modulus.length === 32 && Array.isArray(input.expRsa) && input.expRsa.length === 32) {
      publicInputs.modulus = input.modulus;
      publicInputs.expRsa = input.expRsa;
    }
    return {
      proof: {
        proof,
        publicInputs,
        publicOutputs: { nullifier }
      },
      error: null
    };
  } catch (err) {
    const msg = err?.message || String(err);
    logBasic("zkp.generateJwtCircuitProof error", { message: msg });
    logVerbose("zkp.generateJwtCircuitProofIfAvailable.catch", { name: err?.name, message: msg });
    return { proof: null, error: msg };
  }
}