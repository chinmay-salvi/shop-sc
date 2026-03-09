// // CLIENT-SIDE PROOF GENERATION (runs in browser)
// // CONTRACT: JWT is used only client-side. Backend receives only ZK proof + public inputs.

// import { logBasic, logVerbose } from "./logger";
// import { apiFetch } from "./api";
// import { saveToken } from "./auth";

// const EXTERNAL_NULLIFIER = "shop-sc-access-v1";
// const ACCESS_SIGNAL = "USC_STUDENT_ACCESS";
// const STABLE_ID_DOMAIN = "shop-sc-stable-id-v1";
// const ZKP_APP_PEPPER = import.meta.env.VITE_ZKP_APP_PEPPER || "shop-sc-pepper-v1";

// export const USE_JWT_ZK_LOGIN = import.meta.env.VITE_USE_JWT_ZK_LOGIN === "true";

// // ─── Helpers ──────────────────────────────────────────────────────────────
// function bytesToBigInt(bytes: number[]): bigint {
//   let x = 0n;
//   for (let i = 0; i < bytes.length; i++) x = x * 256n + BigInt(bytes[i]);
//   return x;
// }

// function base64UrlDecode(str: string): Uint8Array {
//   const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
//   const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
//   const binary = atob(base64 + pad);
//   return Uint8Array.from(binary, (c) => c.charCodeAt(0));
// }

// function bigintToLimbs(nBits: number, k: number, x: bigint): string[] {
//   let mod = 1n;
//   for (let idx = 0; idx < nBits; idx++) mod *= 2n;
//   const ret: string[] = [];
//   let xTemp = BigInt(x);
//   for (let idx = 0; idx < k; idx++) {
//     ret.push(String(xTemp % mod));
//     xTemp = xTemp / mod;
//   }
//   return ret;
// }

// // ─── Stable Pseudonym ──────────────────────────────────────────────────────
// export async function getStablePseudonym(): Promise<string> {
//   logVerbose("zkp.getStablePseudonym");
//   const identityJSON = localStorage.getItem("semaphoreIdentity");
//   if (!identityJSON) throw new Error("NOT_ENROLLED");
//   let commitment: string;
//   try {
//     const parsed = JSON.parse(identityJSON);
//     commitment = parsed.commitment || parsed._commitment || identityJSON;
//   } catch {
//     commitment = identityJSON;
//   }
//   const data = new TextEncoder().encode(commitment + ":" + STABLE_ID_DOMAIN);
//   const hashBuffer = await crypto.subtle.digest("SHA-256", data);
//   const stableId = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
//   logVerbose("zkp.getStablePseudonym done", { prefix: stableId.slice(0, 8) + "…" });
//   return stableId;
// }

// // ─── Identity Management ──────────────────────────────────────────────────
// // Creates a proper Semaphore Identity and stores it
// export async function createSemaphoreIdentity(): Promise<string> {
//   logBasic("zkp.createSemaphoreIdentity");
//   const { Identity } = await import("@semaphore-protocol/identity");
//   const identity = new Identity();
//   localStorage.setItem("semaphoreIdentity", identity.export());
//   const commitment = identity.commitment.toString();
//   logVerbose("zkp.createSemaphoreIdentity done", { prefix: commitment.slice(0, 12) + "…" });
//   return commitment;
// }

// export async function getOrCreateSemaphoreCommitment(): Promise<string> {
//   const existing = localStorage.getItem("semaphoreIdentity");
//   if (existing) {
//     try {
//       const { Identity } = await import("@semaphore-protocol/identity");
//       const identity = Identity.import(existing);
//       return identity.commitment.toString();
//     } catch {
//       // corrupt/old format — recreate
//     }
//   }
//   return createSemaphoreIdentity();
// }

// export const isEnrolled = (): boolean =>
//   typeof window !== "undefined" && !!localStorage.getItem("semaphoreIdentity");

// // ─── Enrollment ───────────────────────────────────────────────────────────
// export async function enrollWithEmail(email: string): Promise<unknown> {
//   logBasic("zkp.enrollWithEmail");
//   const identityCommitment = await getOrCreateSemaphoreCommitment();
//   const result = await apiFetch("/auth/enroll", {
//     method: "POST",
//     body: JSON.stringify({ email, identityCommitment }),
//   });
//   logBasic("zkp.enrollWithEmail success");
//   return result;
// }

// export async function enrollWithGoogle(idToken: string): Promise<unknown> {
//   logBasic("zkp.enrollWithGoogle");
//   const identityCommitment = await getOrCreateSemaphoreCommitment();
//   const result = await apiFetch("/auth/enroll", {
//     method: "POST",
//     body: JSON.stringify({ idToken, identityCommitment }),
//   });
//   logBasic("zkp.enrollWithGoogle success");
//   return result;
// }

// // ─── Semaphore Proof ──────────────────────────────────────────────────────
// async function generateAccessProof(): Promise<unknown> {
//   logBasic("zkp.generateAccessProof started");
//   const identityJSON = localStorage.getItem("semaphoreIdentity");
//   if (!identityJSON) throw new Error("NOT_ENROLLED");

//   const { Identity } = await import("@semaphore-protocol/identity");
//   const { Group } = await import("@semaphore-protocol/group");
//   const { generateProof } = await import("@semaphore-protocol/proof");

//   let identity;
//   try {
//     identity = Identity.import(identityJSON);
//   } catch {
//     throw new Error("Identity corrupt — please re-enroll.");
//   }

//   const { commitments, depth } = await apiFetch("/group") as { commitments: string[]; depth: number };
//   logVerbose("zkp.generateAccessProof group fetched", { count: commitments?.length, depth });

//   if (!Array.isArray(commitments) || commitments.length === 0) {
//     throw new Error("Group is empty — please re-enroll.");
//   }

//   const myCommitment = identity.commitment.toString();
//   if (!commitments.includes(myCommitment)) {
//     throw new Error("Your identity is not in the group — please re-enroll.");
//   }

//   const group = new Group(commitments.map((c) => BigInt(c)));
//   const t0 = performance.now();
//   const proof = await generateProof(identity, group, ACCESS_SIGNAL, EXTERNAL_NULLIFIER, depth ?? 20);
//   logBasic("zkp.generateAccessProof done", { durationMs: Math.round(performance.now() - t0) });
//   return proof;
// }

// export async function verifyProofAndCreateSession(): Promise<unknown> {
//   if (USE_JWT_ZK_LOGIN) {
//     throw new Error("Use loginWithJwtZk(idToken) when VITE_USE_JWT_ZK_LOGIN is set.");
//   }
//   logBasic("zkp.verifyProofAndCreateSession started");
//   const proof = await generateAccessProof();
//   const stableId = await getStablePseudonym();
//   const response = await apiFetch("/auth/verify-proof", {
//     method: "POST",
//     body: JSON.stringify({ ...(proof as object), stableId }),
//   }) as { token: string };
//   saveToken(response.token);
//   logBasic("zkp.verifyProofAndCreateSession success");
//   return response;
// }

// // ─── Backup / Recovery ────────────────────────────────────────────────────
// const RECOVERY_SALT = "shop-sc-identity-recovery-v1";
// const RECOVERY_KEY_PREFIX = "shop-sc-recovery-key-";

// async function keyHashFromPassword(password: string): Promise<string> {
//   const data = new TextEncoder().encode(RECOVERY_KEY_PREFIX + password);
//   const hash = await crypto.subtle.digest("SHA-256", data);
//   return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
// }

// async function keyFromPassword(password: string): Promise<CryptoKey> {
//   const enc = new TextEncoder();
//   const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
//   const bits = await crypto.subtle.deriveBits(
//     { name: "PBKDF2", salt: enc.encode(RECOVERY_SALT), iterations: 100000, hash: "SHA-256" },
//     keyMaterial, 256
//   );
//   return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
// }

// async function encryptIdentity(identityJson: string, password: string): Promise<string> {
//   const key = await keyFromPassword(password);
//   const iv = crypto.getRandomValues(new Uint8Array(12));
//   const encoded = new TextEncoder().encode(identityJson);
//   const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
//   const combined = new Uint8Array(iv.length + cipher.byteLength);
//   combined.set(iv, 0);
//   combined.set(new Uint8Array(cipher), iv.length);
//   return btoa(String.fromCharCode(...combined));
// }

// async function decryptIdentity(encryptedBase64: string, password: string): Promise<string> {
//   const key = await keyFromPassword(password);
//   const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
//   const iv = combined.slice(0, 12);
//   const cipher = combined.slice(12);
//   const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
//   return new TextDecoder().decode(dec);
// }

// export async function backupIdentityWithPassword(password: string): Promise<void> {
//   const identityJSON = localStorage.getItem("semaphoreIdentity");
//   if (!identityJSON) throw new Error("NOT_ENROLLED");
//   const keyHash = await keyHashFromPassword(password);
//   const encrypted = await encryptIdentity(identityJSON, password);
//   await apiFetch("/auth/backup-identity", {
//     method: "POST",
//     body: JSON.stringify({ keyHash, encryptedIdentity: encrypted }),
//   });
// }

// export async function recoverIdentityWithPassword(password: string): Promise<void> {
//   const keyHash = await keyHashFromPassword(password);
//   const res = await apiFetch("/auth/recover-identity", {
//     method: "POST",
//     body: JSON.stringify({ keyHash }),
//   }) as { encryptedIdentity: string };
//   const identityJSON = await decryptIdentity(res.encryptedIdentity, password);
//   localStorage.setItem("semaphoreIdentity", identityJSON);
// }

// // ─── JWT ZK Login ─────────────────────────────────────────────────────────
// const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

// export function parseJwtHeader(idToken: string): Record<string, string> {
//   const parts = idToken.split(".");
//   if (parts.length < 1) throw new Error("INVALID_JWT_FORMAT");
//   return JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
// }

// export function parseJwtPayload(idToken: string): Record<string, unknown> {
//   const parts = idToken.split(".");
//   if (parts.length !== 3) throw new Error("INVALID_JWT_FORMAT");
//   return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
// }

// export async function hashToField(s: string): Promise<string> {
//   const enc = new TextEncoder().encode(String(s));
//   const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
//   const hex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
//   return BigInt("0x" + hex.slice(0, 60)).toString();
// }

// async function hashModulusForCircuit(nBase64url: string): Promise<string | null> {
//   if (!nBase64url || typeof nBase64url !== "string") return null;
//   const enc = new TextEncoder().encode(nBase64url);
//   const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
//   const hex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
//   return BigInt("0x" + hex.slice(0, 60)).toString();
// }

// async function fetchJwksKeyByKid(kid: string | null): Promise<{ n: string; e: string } | null> {
//   const res = await fetch(GOOGLE_JWKS_URL);
//   if (!res.ok) return null;
//   const json = await res.json() as { keys: Array<{ kid: string; n: string; e: string }> };
//   const keys = json.keys || [];
//   const key = kid ? keys.find((k) => k.kid === kid) : keys[0];
//   if (!key || !key.n) return null;
//   return { n: key.n, e: key.e || "AQAB" };
// }

// async function fetchGoogleKeyHashForKid(kid: string | null): Promise<string | null> {
//   const res = await fetch(GOOGLE_JWKS_URL);
//   if (!res.ok) return null;
//   const json = await res.json() as { keys: Array<{ kid: string; n: string }> };
//   const keys = json.keys || [];
//   const key = kid ? keys.find((k) => k.kid === kid) : keys[0];
//   if (!key || !key.n) return null;
//   return hashModulusForCircuit(key.n);
// }

// async function sha256ToBigInt(messageStr: string): Promise<bigint> {
//   const enc = new TextEncoder().encode(messageStr);
//   const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
//   return bytesToBigInt(Array.from(new Uint8Array(hashBuffer)));
// }

// interface JwtCircuitInput {
//   pepper: string; currentTime: string; expectedAudHash: string; googleKeyHash: string;
//   sub: string; exp: string; audHash: string; emailSuffix: string[];
//   modulus: string[]; expRsa: string[]; sign: string[]; hashed: string[];
// }

// export async function buildJwtCircuitInput(idToken: string, options: Record<string, unknown> = {}): Promise<JwtCircuitInput> {
//   const payload = parseJwtPayload(idToken);
//   const pepperRaw = (options.pepper as string) ?? ZKP_APP_PEPPER;
//   const pepper = (options.pepperField as string) ?? (await hashToField(pepperRaw));
//   const currentTime = (options.currentTime as number) ?? Math.floor(Date.now() / 1000);
//   const googleClientId = (options.googleClientId as string) ?? (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "");
//   const expectedAudHash = (options.expectedAudHash as string) ?? (googleClientId ? await hashToField(googleClientId) : "0");
//   const aud = (payload.aud as string) ?? "";
//   const audHash = (options.audHash as string) ?? (aud ? await hashToField(aud) : "0");
//   let googleKeyHash = options.googleKeyHash as string | null;
//   if (!googleKeyHash || googleKeyHash === "0") {
//     const header = parseJwtHeader(idToken);
//     googleKeyHash = (await fetchGoogleKeyHashForKid(header.kid || null)) || "0";
//   }
//   const sub = String(payload.sub ?? "0");
//   const exp = String(payload.exp ?? 0);
//   const email = (payload.email as string) || "";
//   if (!email.toLowerCase().endsWith("@usc.edu") || email.length < 8) throw new Error("EMAIL_MUST_END_WITH_USC_EDU");
//   const emailSuffix = Array.from(email.slice(-8)).map((c) => String(c.charCodeAt(0)));
//   const parts = idToken.split(".");
//   if (parts.length !== 3) throw new Error("JWT must have 3 parts");
//   const hashed = bigintToLimbs(64, 4, await sha256ToBigInt(parts[0] + "." + parts[1]));
//   const sign = bigintToLimbs(64, 32, bytesToBigInt(Array.from(base64UrlDecode(parts[2]))));
//   const header = parseJwtHeader(idToken);
//   const jwksKey = await fetchJwksKeyByKid(header.kid || null);
//   if (!jwksKey) throw new Error("JWKS key not found for kid");
//   const modulus = bigintToLimbs(64, 32, bytesToBigInt(Array.from(base64UrlDecode(jwksKey.n))));
//   const expRsa = bigintToLimbs(64, 32, bytesToBigInt(Array.from(base64UrlDecode(jwksKey.e))));
//   return { pepper, currentTime: String(currentTime), expectedAudHash, googleKeyHash, sub, exp, audHash, emailSuffix, modulus, expRsa, sign, hashed };
// }

// function toJsonSafeProof(proof: Record<string, unknown>): Record<string, unknown> {
//   if (!proof || typeof proof !== "object") return {};
//   const str = (x: unknown) => (x != null && typeof x !== "object" ? String(x) : x);
//   const arr = (a: unknown) => Array.isArray(a) ? a.map(str) : [];
//   const piB = Array.isArray(proof.pi_b)
//     ? (proof.pi_b as unknown[][]).map((row) => Array.isArray(row) ? row.map(str) : [])
//     : [];
//   return { pi_a: arr(proof.pi_a), pi_b: piB, pi_c: arr(proof.pi_c) };
// }

// const ZKP_WASM_URL = "/zkp/jwt_usc_main_js/jwt_usc_main.wasm";
// const ZKP_ZKEY_URL = "/zkp/jwt_usc_main_final.zkey";

// interface ProofResult {
//   proof: Record<string, unknown>;
//   publicInputs: Record<string, unknown>;
//   publicOutputs: { nullifier: string };
// }

// async function generateJwtCircuitProofIfAvailable(idToken: string): Promise<{ proof: ProofResult | null; error: string | null }> {
//   try {
//     const input = await buildJwtCircuitInput(idToken);
//     const res = await fetch(ZKP_ZKEY_URL, { method: "HEAD" });
//     if (!res.ok) return { proof: null, error: `Circuit artifacts not found (${res.status}). Run: cd circuits && npm run copy-to-frontend` };
//     const snarkjs = await import("snarkjs");
//     const { proof, publicSignals } = await (snarkjs as { groth16: { fullProve: (i: unknown, w: string, z: string) => Promise<{ proof: unknown; publicSignals: string[] }> } }).groth16.fullProve(input, window.location.origin + ZKP_WASM_URL, window.location.origin + ZKP_ZKEY_URL);
//     if (!proof || !Array.isArray(publicSignals) || publicSignals.length < 1) return { proof: null, error: "Invalid proof output" };
//     const nullifier = String(publicSignals[publicSignals.length - 1]);
//     const publicInputs: Record<string, unknown> = { pepper: input.pepper, currentTime: input.currentTime, expectedAudHash: input.expectedAudHash, googleKeyHash: input.googleKeyHash };
//     if (input.modulus.length === 32 && input.expRsa.length === 32) { publicInputs.modulus = input.modulus; publicInputs.expRsa = input.expRsa; }
//     return { proof: { proof: proof as Record<string, unknown>, publicInputs, publicOutputs: { nullifier } }, error: null };
//   } catch (err) {
//     return { proof: null, error: (err as Error)?.message || String(err) };
//   }
// }

// export async function loginWithJwtZk(idToken: string): Promise<unknown> {
//   logBasic("zkp.loginWithJwtZk started");
//   if (!USE_JWT_ZK_LOGIN) throw new Error("VITE_USE_JWT_ZK_LOGIN must be true to use JWT ZK login.");
//   const { proof: proofResult, error: proofError } = await generateJwtCircuitProofIfAvailable(idToken);
//   if (!proofResult) throw new Error(proofError || "JWT ZK proof not available.");
//   const rawProof = (proofResult.proof as Record<string, unknown>)?.proof !== undefined
//     ? (proofResult.proof as Record<string, unknown>).proof as Record<string, unknown>
//     : proofResult.proof;
//   const response = await apiFetch("/auth/verify-proof", {
//     method: "POST",
//     body: JSON.stringify({
//       proof: toJsonSafeProof(rawProof),
//       publicInputs: {
//         pepper: String((proofResult.publicInputs as Record<string, unknown>)?.pepper ?? ""),
//         currentTime: String((proofResult.publicInputs as Record<string, unknown>)?.currentTime ?? ""),
//         expectedAudHash: String((proofResult.publicInputs as Record<string, unknown>)?.expectedAudHash ?? ""),
//         googleKeyHash: String((proofResult.publicInputs as Record<string, unknown>)?.googleKeyHash ?? ""),
//       },
//       publicOutputs: { nullifier: String(proofResult.publicOutputs?.nullifier ?? "") },
//     }),
//   }) as { token: string };
//   saveToken(response.token);
//   logBasic("zkp.loginWithJwtZk success");
//   return response;
// }



// CLIENT-SIDE PROOF GENERATION (runs in browser)
// CONTRACT: JWT is used only client-side. Backend receives only ZK proof + public inputs.

import { logBasic, logVerbose } from "./logger";
import { apiFetch } from "./api";
import { saveToken } from "./auth";

const EXTERNAL_NULLIFIER = "shop-sc-access-v1";
const ACCESS_SIGNAL = "USC_STUDENT_ACCESS";
const STABLE_ID_DOMAIN = "shop-sc-stable-id-v1";
const ZKP_APP_PEPPER = import.meta.env.VITE_ZKP_APP_PEPPER || "shop-sc-pepper-v1";

export const USE_JWT_ZK_LOGIN = import.meta.env.VITE_USE_JWT_ZK_LOGIN === "true";

// ─── Helpers ──────────────────────────────────────────────────────────────
function bytesToBigInt(bytes: number[]): bigint {
  let x = 0n;
  for (let i = 0; i < bytes.length; i++) x = x * 256n + BigInt(bytes[i]);
  return x;
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
  const binary = atob(base64 + pad);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function bigintToLimbs(nBits: number, k: number, x: bigint): string[] {
  let mod = 1n;
  for (let idx = 0; idx < nBits; idx++) mod *= 2n;
  const ret: string[] = [];
  let xTemp = BigInt(x);
  for (let idx = 0; idx < k; idx++) {
    ret.push(String(xTemp % mod));
    xTemp = xTemp / mod;
  }
  return ret;
}

// ─── Stable Pseudonym ──────────────────────────────────────────────────────
export async function getStablePseudonym(): Promise<string> {
  logVerbose("zkp.getStablePseudonym");
  const identityJSON = localStorage.getItem("semaphoreIdentity");
  if (!identityJSON) throw new Error("NOT_ENROLLED");
  let commitment: string;
  try {
    const parsed = JSON.parse(identityJSON);
    commitment = parsed.commitment || parsed._commitment || identityJSON;
  } catch {
    commitment = identityJSON;
  }
  const data = new TextEncoder().encode(commitment + ":" + STABLE_ID_DOMAIN);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const stableId = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  logVerbose("zkp.getStablePseudonym done", { prefix: stableId.slice(0, 8) + "…" });
  return stableId;
}

// ─── Identity Management ──────────────────────────────────────────────────
// Creates a proper Semaphore Identity and stores it
export async function createSemaphoreIdentity(): Promise<string> {
  logBasic("zkp.createSemaphoreIdentity");
  const { Identity } = await import("@semaphore-protocol/identity");
  const identity = new Identity();
  localStorage.setItem("semaphoreIdentity", identity.export());
  const commitment = identity.commitment.toString();
  logVerbose("zkp.createSemaphoreIdentity done", { prefix: commitment.slice(0, 12) + "…" });
  return commitment;
}

export async function getOrCreateSemaphoreCommitment(): Promise<string> {
  const existing = localStorage.getItem("semaphoreIdentity");
  if (existing) {
    try {
      const { Identity } = await import("@semaphore-protocol/identity");
      const identity = Identity.import(existing);
      return identity.commitment.toString();
    } catch {
      // corrupt/old format — recreate
    }
  }
  return createSemaphoreIdentity();
}

export const isEnrolled = (): boolean =>
  typeof window !== "undefined" && !!localStorage.getItem("semaphoreIdentity");

// ─── Enrollment ───────────────────────────────────────────────────────────
export async function enrollWithEmail(email: string): Promise<unknown> {
  logBasic("zkp.enrollWithEmail");
  const identityCommitment = await getOrCreateSemaphoreCommitment();
  const result = await apiFetch("/auth/enroll", {
    method: "POST",
    body: JSON.stringify({ email, identityCommitment }),
  });
  logBasic("zkp.enrollWithEmail success");
  return result;
}

export async function enrollWithGoogle(idToken: string): Promise<unknown> {
  logBasic("zkp.enrollWithGoogle");
  const identityCommitment = await getOrCreateSemaphoreCommitment();
  const result = await apiFetch("/auth/enroll", {
    method: "POST",
    body: JSON.stringify({ idToken, identityCommitment }),
  });
  logBasic("zkp.enrollWithGoogle success");
  return result;
}

// ─── Semaphore Proof ──────────────────────────────────────────────────────
// onStep(n) is called as each proof step completes — drives the UI animation
async function generateAccessProof(onStep?: (step: number) => void): Promise<unknown> {
  logBasic("zkp.generateAccessProof started");
  const identityJSON = localStorage.getItem("semaphoreIdentity");
  if (!identityJSON) throw new Error("NOT_ENROLLED");

  // Step 0 — load libraries + fetch group root
  onStep?.(0);
  const { Identity } = await import("@semaphore-protocol/identity");
  const { Group } = await import("@semaphore-protocol/group");
  const { generateProof } = await import("@semaphore-protocol/proof");

  let identity;
  try {
    identity = Identity.import(identityJSON);
  } catch {
    throw new Error("Identity corrupt — please re-enroll.");
  }

  const { commitments, depth } = await apiFetch("/group") as { commitments: string[]; depth: number };
  logVerbose("zkp.generateAccessProof group fetched", { count: commitments?.length, depth });

  if (!Array.isArray(commitments) || commitments.length === 0) {
    throw new Error("Group is empty — please re-enroll.");
  }

  const myCommitment = identity.commitment.toString();
  if (!commitments.includes(myCommitment)) {
    throw new Error("Your identity is not in the group — please re-enroll.");
  }

  // Step 1 — deriving commitment
  onStep?.(1);
  await new Promise((r) => setTimeout(r, 300));

  // Step 2 — building Merkle witness
  onStep?.(2);
  const group = new Group(commitments.map((c) => BigInt(c)));
  await new Promise((r) => setTimeout(r, 300));

  // Step 3 — generating Groth16 proof (this is the slow part)
  onStep?.(3);
  const t0 = performance.now();
  const proof = await generateProof(identity, group, ACCESS_SIGNAL, EXTERNAL_NULLIFIER, depth ?? 20);
  logBasic("zkp.generateAccessProof done", { durationMs: Math.round(performance.now() - t0) });
  return proof;
}

export async function verifyProofAndCreateSession(onStep?: (step: number) => void): Promise<unknown> {
  if (USE_JWT_ZK_LOGIN) {
    throw new Error("Use loginWithJwtZk(idToken) when VITE_USE_JWT_ZK_LOGIN is set.");
  }
  logBasic("zkp.verifyProofAndCreateSession started");
  const proof = await generateAccessProof(onStep);
  const stableId = await getStablePseudonym();

  // Step 4 — verifying on backend
  onStep?.(4);
  const response = await apiFetch("/auth/verify-proof", {
    method: "POST",
    body: JSON.stringify({ ...(proof as object), stableId }),
  }) as { token: string };
  saveToken(response.token);
  logBasic("zkp.verifyProofAndCreateSession success");
  return response;
}

// ─── Backup / Recovery ────────────────────────────────────────────────────
const RECOVERY_SALT = "shop-sc-identity-recovery-v1";
const RECOVERY_KEY_PREFIX = "shop-sc-recovery-key-";

async function keyHashFromPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(RECOVERY_KEY_PREFIX + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function keyFromPassword(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(RECOVERY_SALT), iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptIdentity(identityJson: string, password: string): Promise<string> {
  const key = await keyFromPassword(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(identityJson);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptIdentity(encryptedBase64: string, password: string): Promise<string> {
  const key = await keyFromPassword(password);
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(dec);
}

export async function backupIdentityWithPassword(password: string): Promise<void> {
  const identityJSON = localStorage.getItem("semaphoreIdentity");
  if (!identityJSON) throw new Error("NOT_ENROLLED");
  const keyHash = await keyHashFromPassword(password);
  const encrypted = await encryptIdentity(identityJSON, password);
  await apiFetch("/auth/backup-identity", {
    method: "POST",
    body: JSON.stringify({ keyHash, encryptedIdentity: encrypted }),
  });
}

export async function recoverIdentityWithPassword(password: string): Promise<void> {
  const keyHash = await keyHashFromPassword(password);
  const res = await apiFetch("/auth/recover-identity", {
    method: "POST",
    body: JSON.stringify({ keyHash }),
  }) as { encryptedIdentity: string };
  const identityJSON = await decryptIdentity(res.encryptedIdentity, password);
  localStorage.setItem("semaphoreIdentity", identityJSON);
}

// ─── JWT ZK Login ─────────────────────────────────────────────────────────
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export function parseJwtHeader(idToken: string): Record<string, string> {
  const parts = idToken.split(".");
  if (parts.length < 1) throw new Error("INVALID_JWT_FORMAT");
  return JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
}

export function parseJwtPayload(idToken: string): Record<string, unknown> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("INVALID_JWT_FORMAT");
  return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
}

export async function hashToField(s: string): Promise<string> {
  const enc = new TextEncoder().encode(String(s));
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return BigInt("0x" + hex.slice(0, 60)).toString();
}

async function hashModulusForCircuit(nBase64url: string): Promise<string | null> {
  if (!nBase64url || typeof nBase64url !== "string") return null;
  const enc = new TextEncoder().encode(nBase64url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return BigInt("0x" + hex.slice(0, 60)).toString();
}

async function fetchJwksKeyByKid(kid: string | null): Promise<{ n: string; e: string } | null> {
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) return null;
  const json = await res.json() as { keys: Array<{ kid: string; n: string; e: string }> };
  const keys = json.keys || [];
  const key = kid ? keys.find((k) => k.kid === kid) : keys[0];
  if (!key || !key.n) return null;
  return { n: key.n, e: key.e || "AQAB" };
}

async function fetchGoogleKeyHashForKid(kid: string | null): Promise<string | null> {
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) return null;
  const json = await res.json() as { keys: Array<{ kid: string; n: string }> };
  const keys = json.keys || [];
  const key = kid ? keys.find((k) => k.kid === kid) : keys[0];
  if (!key || !key.n) return null;
  return hashModulusForCircuit(key.n);
}

async function sha256ToBigInt(messageStr: string): Promise<bigint> {
  const enc = new TextEncoder().encode(messageStr);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  return bytesToBigInt(Array.from(new Uint8Array(hashBuffer)));
}

interface JwtCircuitInput {
  pepper: string; currentTime: string; expectedAudHash: string; googleKeyHash: string;
  sub: string; exp: string; audHash: string; emailSuffix: string[];
  modulus: string[]; expRsa: string[]; sign: string[]; hashed: string[];
}

export async function buildJwtCircuitInput(idToken: string, options: Record<string, unknown> = {}): Promise<JwtCircuitInput> {
  const payload = parseJwtPayload(idToken);
  const pepperRaw = (options.pepper as string) ?? ZKP_APP_PEPPER;
  const pepper = (options.pepperField as string) ?? (await hashToField(pepperRaw));
  const currentTime = (options.currentTime as number) ?? Math.floor(Date.now() / 1000);
  const googleClientId = (options.googleClientId as string) ?? (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "");
  const expectedAudHash = (options.expectedAudHash as string) ?? (googleClientId ? await hashToField(googleClientId) : "0");
  const aud = (payload.aud as string) ?? "";
  const audHash = (options.audHash as string) ?? (aud ? await hashToField(aud) : "0");
  let googleKeyHash = options.googleKeyHash as string | null;
  if (!googleKeyHash || googleKeyHash === "0") {
    const header = parseJwtHeader(idToken);
    googleKeyHash = (await fetchGoogleKeyHashForKid(header.kid || null)) || "0";
  }
  const sub = String(payload.sub ?? "0");
  const exp = String(payload.exp ?? 0);
  const email = (payload.email as string) || "";
  if (!email.toLowerCase().endsWith("@usc.edu") || email.length < 8) throw new Error("EMAIL_MUST_END_WITH_USC_EDU");
  const emailSuffix = Array.from(email.slice(-8)).map((c) => String(c.charCodeAt(0)));
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("JWT must have 3 parts");
  const hashed = bigintToLimbs(64, 4, await sha256ToBigInt(parts[0] + "." + parts[1]));
  const sign = bigintToLimbs(64, 32, bytesToBigInt(Array.from(base64UrlDecode(parts[2]))));
  const header = parseJwtHeader(idToken);
  const jwksKey = await fetchJwksKeyByKid(header.kid || null);
  if (!jwksKey) throw new Error("JWKS key not found for kid");
  const modulus = bigintToLimbs(64, 32, bytesToBigInt(Array.from(base64UrlDecode(jwksKey.n))));
  const expRsa = bigintToLimbs(64, 32, bytesToBigInt(Array.from(base64UrlDecode(jwksKey.e))));
  return { pepper, currentTime: String(currentTime), expectedAudHash, googleKeyHash, sub, exp, audHash, emailSuffix, modulus, expRsa, sign, hashed };
}

function toJsonSafeProof(proof: Record<string, unknown>): Record<string, unknown> {
  if (!proof || typeof proof !== "object") return {};
  const str = (x: unknown) => (x != null && typeof x !== "object" ? String(x) : x);
  const arr = (a: unknown) => Array.isArray(a) ? a.map(str) : [];
  const piB = Array.isArray(proof.pi_b)
    ? (proof.pi_b as unknown[][]).map((row) => Array.isArray(row) ? row.map(str) : [])
    : [];
  return { pi_a: arr(proof.pi_a), pi_b: piB, pi_c: arr(proof.pi_c) };
}

const ZKP_WASM_URL = "/zkp/jwt_usc_main_js/jwt_usc_main.wasm";
const ZKP_ZKEY_URL = "/zkp/jwt_usc_main_final.zkey";

interface ProofResult {
  proof: Record<string, unknown>;
  publicInputs: Record<string, unknown>;
  publicOutputs: { nullifier: string };
}

async function generateJwtCircuitProofIfAvailable(idToken: string): Promise<{ proof: ProofResult | null; error: string | null }> {
  try {
    const input = await buildJwtCircuitInput(idToken);
    const res = await fetch(ZKP_ZKEY_URL, { method: "HEAD" });
    if (!res.ok) return { proof: null, error: `Circuit artifacts not found (${res.status}). Run: cd circuits && npm run copy-to-frontend` };
    const snarkjs = await import("snarkjs");
    const { proof, publicSignals } = await (snarkjs as { groth16: { fullProve: (i: unknown, w: string, z: string) => Promise<{ proof: unknown; publicSignals: string[] }> } }).groth16.fullProve(input, window.location.origin + ZKP_WASM_URL, window.location.origin + ZKP_ZKEY_URL);
    if (!proof || !Array.isArray(publicSignals) || publicSignals.length < 1) return { proof: null, error: "Invalid proof output" };
    const nullifier = String(publicSignals[publicSignals.length - 1]);
    const publicInputs: Record<string, unknown> = { pepper: input.pepper, currentTime: input.currentTime, expectedAudHash: input.expectedAudHash, googleKeyHash: input.googleKeyHash };
    if (input.modulus.length === 32 && input.expRsa.length === 32) { publicInputs.modulus = input.modulus; publicInputs.expRsa = input.expRsa; }
    return { proof: { proof: proof as Record<string, unknown>, publicInputs, publicOutputs: { nullifier } }, error: null };
  } catch (err) {
    return { proof: null, error: (err as Error)?.message || String(err) };
  }
}

export async function loginWithJwtZk(idToken: string): Promise<unknown> {
  logBasic("zkp.loginWithJwtZk started");
  if (!USE_JWT_ZK_LOGIN) throw new Error("VITE_USE_JWT_ZK_LOGIN must be true to use JWT ZK login.");
  const { proof: proofResult, error: proofError } = await generateJwtCircuitProofIfAvailable(idToken);
  if (!proofResult) throw new Error(proofError || "JWT ZK proof not available.");
  const rawProof = (proofResult.proof as Record<string, unknown>)?.proof !== undefined
    ? (proofResult.proof as Record<string, unknown>).proof as Record<string, unknown>
    : proofResult.proof;
  const response = await apiFetch("/auth/verify-proof", {
    method: "POST",
    body: JSON.stringify({
      proof: toJsonSafeProof(rawProof),
      publicInputs: {
        pepper: String((proofResult.publicInputs as Record<string, unknown>)?.pepper ?? ""),
        currentTime: String((proofResult.publicInputs as Record<string, unknown>)?.currentTime ?? ""),
        expectedAudHash: String((proofResult.publicInputs as Record<string, unknown>)?.expectedAudHash ?? ""),
        googleKeyHash: String((proofResult.publicInputs as Record<string, unknown>)?.googleKeyHash ?? ""),
      },
      publicOutputs: { nullifier: String(proofResult.publicOutputs?.nullifier ?? "") },
    }),
  }) as { token: string };
  saveToken(response.token);
  logBasic("zkp.loginWithJwtZk success");
  return response;
}