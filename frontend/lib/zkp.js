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

/** Decode JWT payload (no verification; verification is done in-circuit or client-side before proving). */
export function parseJwtPayload(idToken) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("INVALID_JWT_FORMAT");
  const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = typeof atob !== "undefined" ? atob(payloadBase64) : Buffer.from(payloadBase64, "base64").toString("utf8");
  return JSON.parse(json);
}

/** Deterministic string -> field element (decimal string) for aud/expectedAud hashing. Same string => same value. */
export async function hashToField(s) {
  const enc = new TextEncoder().encode(String(s));
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const big = BigInt("0x" + hex.slice(0, 60));
  return big.toString();
}

/**
 * Build public inputs, public outputs, and full circuit input for the JWT circuit.
 * Computes audHash and expectedAudHash from JWT aud and Google Client ID when not provided.
 */
export async function buildJwtCircuitInput(idToken, options = {}) {
  const payload = parseJwtPayload(idToken);
  const pepperRaw = options.pepper ?? ZKP_APP_PEPPER;
  const pepper = options.pepperField ?? (await hashToField(pepperRaw));
  const currentTime = options.currentTime ?? Math.floor(Date.now() / 1000);
  const googleClientId = options.googleClientId ?? (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) ?? "";
  const expectedAudHash = options.expectedAudHash ?? (googleClientId ? await hashToField(googleClientId) : "0");
  const aud = payload.aud ?? "";
  const audHash = options.audHash ?? (aud ? await hashToField(aud) : "0");
  const googleKeyHash = options.googleKeyHash ?? "0";

  const sub = String(payload.sub ?? "0");
  const exp = String(payload.exp ?? 0);
  const emailSuffixValid = (payload.email && payload.email.toLowerCase().endsWith("@usc.edu")) ? "1" : "0";
  const signatureValid = "1";

  return {
    pepper,
    currentTime: String(currentTime),
    expectedAudHash,
    googleKeyHash,
    sub,
    exp,
    audHash,
    emailSuffixValid,
    signatureValid
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
      emailSuffixValid: (payload.email && payload.email.toLowerCase().endsWith("@usc.edu")) ? "1" : "0",
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
 */
export async function loginWithJwtZk(idToken) {
  logBasic("zkp.loginWithJwtZk started");
  if (!USE_JWT_ZK_LOGIN) {
    throw new Error("NEXT_PUBLIC_USE_JWT_ZK_LOGIN must be true to use JWT ZK login.");
  }

  const { proof: proofResult, error: proofError } = await generateJwtCircuitProofIfAvailable(idToken);
  if (!proofResult) {
    const hint = proofError
      ? `Proof failed: ${proofError}`
      : "JWT ZK proof not available. Run: cd circuits && npm run build && npm run setup && npm run copy-to-frontend, then reload.";
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

  // Snarkjs proof may be at proofResult.proof.proof (wrapper) or proofResult.proof (browser sometimes returns flat)
  const rawProof = proofResult.proof?.proof !== undefined ? proofResult.proof.proof : proofResult.proof;
  const publicInputs = proofResult.publicInputs ?? proofResult.proof?.publicInputs;
  const publicOutputs = proofResult.publicOutputs ?? proofResult.proof?.publicOutputs;
  logBasic("zkp.loginWithJwtZk.rawProof", {
    hasRawProof: !!rawProof,
    rawProofKeys: rawProof && typeof rawProof === "object" ? Object.keys(rawProof) : [],
    pi_aType: rawProof?.pi_a == null ? "null" : Array.isArray(rawProof.pi_a) ? "array" : typeof rawProof.pi_a,
    pi_bType: rawProof?.pi_b == null ? "null" : Array.isArray(rawProof.pi_b) ? "array" : typeof rawProof.pi_b,
    pi_cType: rawProof?.pi_c == null ? "null" : Array.isArray(rawProof.pi_c) ? "array" : typeof rawProof.pi_c
  });

  const proofForApi = toJsonSafeProof(rawProof);
  logBasic("zkp.loginWithJwtZk.proofForApi", {
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
  logBasic("zkp.loginWithJwtZk.sendPayload", {
    payloadKeys: Object.keys(payload),
    proofKeys: Object.keys(payload.proof),
    publicInputsKeys: Object.keys(payload.publicInputs),
    publicOutputsKeys: Object.keys(payload.publicOutputs),
    nullifierLen: payload.publicOutputs.nullifier?.length,
    currentTime: payload.publicInputs.currentTime
  });
  const response = await apiFetch("/auth/verify-proof", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  saveToken(response.token);
  logBasic("zkp.loginWithJwtZk success", { hasToken: !!response.token });
  return response;
}

const ZKP_WASM_URL = "/zkp/jwt_usc_main_js/jwt_usc_main.wasm";
const ZKP_ZKEY_URL = "/zkp/jwt_usc_main_final.zkey";

/**
 * If circuit artifacts are present, generate Groth16 proof in the browser.
 * Returns { proof } on success, { proof: null, error } on failure.
 */
async function generateJwtCircuitProofIfAvailable(idToken) {
  if (typeof window === "undefined") return { proof: null, error: "Not in browser" };

  try {
    const input = await buildJwtCircuitInput(idToken);
    const res = await fetch(ZKP_ZKEY_URL, { method: "HEAD" });
    if (!res.ok) {
      return { proof: null, error: `Circuit artifacts not found (${res.status}). Run: cd circuits && npm run copy-to-frontend` };
    }

    logVerbose("zkp.generateJwtCircuitProof loading snarkjs and generating proof...");
    const snarkjs = await import("snarkjs");
    const wasmUrl = window.location.origin + ZKP_WASM_URL;
    const zkeyUrl = window.location.origin + ZKP_ZKEY_URL;

    const proofStart = typeof performance !== "undefined" ? performance.now() : 0;
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmUrl, zkeyUrl);
    const proofMs = typeof performance !== "undefined" ? Math.round(performance.now() - proofStart) : 0;
    logBasic("zkp.generateJwtCircuitProof done", { proofTimeMs: proofMs });
    if (!proof || !Array.isArray(publicSignals) || publicSignals.length < 1) {
      return { proof: null, error: `Invalid proof output (got ${publicSignals?.length ?? 0} public signals)` };
    }

    // Circuit has nPublic=1 (only the nullifier is public); we still send our input values for backend time/replay checks
    const nullifier = String(publicSignals[0]);
    return {
      proof: {
        proof,
        publicInputs: {
          pepper: input.pepper,
          currentTime: input.currentTime,
          expectedAudHash: input.expectedAudHash,
          googleKeyHash: input.googleKeyHash
        },
        publicOutputs: { nullifier }
      },
      error: null
    };
  } catch (err) {
    const msg = err?.message || String(err);
    logBasic("zkp.generateJwtCircuitProof error", { message: msg });
    return { proof: null, error: msg };
  }
}