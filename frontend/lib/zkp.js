// CLIENT-SIDE PROOF GENERATION (runs in browser)
import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import sharedConstants from "../../shared/constants";
import { apiFetch } from "./api";
import { saveToken } from "./auth";
import { logBasic, logVerbose } from "./logger";

const { EXTERNAL_NULLIFIER, ACCESS_SIGNAL, STABLE_ID_DOMAIN } = sharedConstants;

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

/** Enroll with Google ID token (no PII sent; backend verifies hd=usc.edu only). */
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