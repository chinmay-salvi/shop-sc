/**
 * Verification for JWT @usc.edu ZK circuit (Groth16).
 * Payload: proof + public inputs/outputs; nullifier is the stable pseudonymous user id.
 * Server enforces Google key + audience via JWKS hashes before accepting proof.
 * See docs/zk-auth-architecture.md and circuits/README.md.
 */
const path = require("path");
const fs = require("fs");
const {
  isJwtProofReplay,
  markJwtProofUsed,
  isNullifierRevoked
} = require("../models/nullifier");
const { validateServerSideHashes } = require("./jwksService");
const { logBasic, logVerbose } = require("../config/logger");

const TIME_SKEW_SECONDS = parseInt(process.env.ZKP_TIME_SKEW_SECONDS || "120", 10);
const VKEY_PATH = process.env.JWT_CIRCUIT_VKEY_PATH || path.join(__dirname, "../config/jwt_circuit_vkey.json");

let cachedVkey = null;

function loadVerificationKey() {
  logVerbose("jwtCircuit.loadVerificationKey.entry", { path: VKEY_PATH });
  if (cachedVkey) {
    logVerbose("jwtCircuit.loadVerificationKey.cache_hit");
    return cachedVkey;
  }
  if (!fs.existsSync(VKEY_PATH)) {
    logBasic("jwtCircuit.loadVerificationKey.missing", { path: VKEY_PATH });
    throw new Error("JWT_CIRCUIT_VKEY_NOT_CONFIGURED: Copy circuits/build/verification_key.json to backend/src/config/jwt_circuit_vkey.json");
  }
  cachedVkey = JSON.parse(fs.readFileSync(VKEY_PATH, "utf8"));
  logVerbose("jwtCircuit.loadVerificationKey.loaded", { nPublic: cachedVkey.nPublic, icLen: cachedVkey.IC?.length });
  return cachedVkey;
}

/**
 * Build public signals for Groth16.verify.
 * RSA circuit (nPublic=69): [pepper, currentTime, expectedAudHash, googleKeyHash, modulus[0..31], expRsa[0..31], nullifier].
 * Legacy (nPublic=1): [nullifier].
 */
function buildPublicSignals(publicInputs, publicOutputs, vkey) {
  const { nullifier } = publicOutputs;
  const nPublic = vkey && typeof vkey.nPublic === "number" ? vkey.nPublic : 1;
  if (nPublic >= 69 && Array.isArray(publicInputs.modulus) && publicInputs.modulus.length === 32 && Array.isArray(publicInputs.expRsa) && publicInputs.expRsa.length === 32) {
    const modulus = publicInputs.modulus.map((x) => String(x));
    const expRsa = publicInputs.expRsa.map((x) => String(x));
    const signals = [
      String(publicInputs.pepper),
      String(publicInputs.currentTime),
      String(publicInputs.expectedAudHash),
      String(publicInputs.googleKeyHash),
      ...modulus,
      ...expRsa,
      String(nullifier)
    ];
    logVerbose("jwtCircuit.buildPublicSignals", { length: signals.length, mode: "rsa69", nullifierPrefix: String(nullifier).slice(0, 12) + "…" });
    return signals;
  }
  const signals = [String(nullifier)];
  logVerbose("jwtCircuit.buildPublicSignals", { length: signals.length, mode: "legacy", nullifierPrefix: signals[0]?.slice(0, 12) + "…" });
  return signals;
}

/**
 * Verify JWT-circuit proof, time window, server-side key/aud binding, replay/revocation; mark nullifier used.
 * @param {object} payload - { proof, publicInputs: { pepper, currentTime, expectedAudHash, googleKeyHash }, publicOutputs: { nullifier } }
 * @returns {Promise<{ valid: true, nullifierHash: string }>}
 */
async function verifyJwtCircuitProof(payload) {
  logBasic("jwtCircuit.verifyJwtCircuitProof.entry", {
    payloadKeys: payload ? Object.keys(payload) : [],
    hasProofRaw: !!payload?.proof,
    proofRawKeys: payload?.proof && typeof payload.proof === "object" ? Object.keys(payload.proof) : [],
    hasPublicInputs: !!payload?.publicInputs,
    hasPublicOutputs: !!payload?.publicOutputs,
    hasNullifier: !!payload?.publicOutputs?.nullifier
  });
  logVerbose("jwtCircuit.verifyJwtCircuitProof.payload_shape", {
    publicInputsKeys: payload?.publicInputs ? Object.keys(payload.publicInputs) : [],
    publicOutputsKeys: payload?.publicOutputs ? Object.keys(payload.publicOutputs) : []
  });

  const { proof: proofRaw, publicInputs, publicOutputs } = payload;
  if (!proofRaw || !publicInputs || !publicOutputs || !publicOutputs.nullifier) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "missing_top_level", hasProofRaw: !!proofRaw, hasPublicInputs: !!publicInputs, hasPublicOutputs: !!publicOutputs, hasNullifier: !!publicOutputs?.nullifier });
    throw new Error("INVALID_JWT_CIRCUIT_PAYLOAD");
  }
  const proof = proofRaw.proof !== undefined ? proofRaw.proof : proofRaw;
  logVerbose("jwtCircuit.verifyJwtCircuitProof.proof_resolved", {
    proofKeys: proof && typeof proof === "object" ? Object.keys(proof) : [],
    pi_aType: proof?.pi_a == null ? "null" : Array.isArray(proof.pi_a) ? "array" : typeof proof.pi_a,
    pi_aLen: Array.isArray(proof?.pi_a) ? proof.pi_a.length : undefined,
    pi_bType: proof?.pi_b == null ? "null" : Array.isArray(proof.pi_b) ? "array" : typeof proof.pi_b,
    pi_cType: proof?.pi_c == null ? "null" : Array.isArray(proof.pi_c) ? "array" : typeof proof.pi_c
  });

  if (!proof || typeof proof !== "object") {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "proof_not_object" });
    throw new Error("INVALID_JWT_CIRCUIT_PAYLOAD");
  }
  const hasPi = [proof.pi_a, proof.pi_b, proof.pi_c].every(
    (p) => p != null && (Array.isArray(p) || typeof p === "object")
  );
  if (!hasPi) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "proof_missing_pi", hasPi_a: !!proof.pi_a, hasPi_b: !!proof.pi_b, hasPi_c: !!proof.pi_c });
    throw new Error("INVALID_JWT_CIRCUIT_PAYLOAD");
  }

  const nullifier = String(publicOutputs.nullifier);
  const currentTime = parseInt(publicInputs.currentTime, 10);
  logBasic("jwtCircuit.verifyJwtCircuitProof.parsed", { nullifierLen: nullifier.length, currentTime, currentTimeNaN: Number.isNaN(currentTime) });
  logVerbose("jwtCircuit.verifyJwtCircuitProof.parsed_inputs", {
    pepperLen: String(publicInputs.pepper ?? "").length,
    expectedAudHashPrefix: String(publicInputs.expectedAudHash ?? "").slice(0, 12) + "…",
    googleKeyHashPrefix: String(publicInputs.googleKeyHash ?? "").slice(0, 12) + "…"
  });
  if (Number.isNaN(currentTime)) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "INVALID_TIMESTAMP" });
    throw new Error("INVALID_TIMESTAMP");
  }

  logBasic("jwtCircuit.verifyJwtCircuitProof.step", { step: 1, name: "time_window" });
  const now = Math.floor(Date.now() / 1000);
  logVerbose("jwtCircuit.verifyJwtCircuitProof.time_check", { currentTime, now, skew: TIME_SKEW_SECONDS, diff: Math.abs(currentTime - now) });
  if (Math.abs(currentTime - now) > TIME_SKEW_SECONDS) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "TIMESTAMP_OUT_OF_RANGE", currentTime, now, skew: TIME_SKEW_SECONDS });
    throw new Error("TIMESTAMP_OUT_OF_RANGE");
  }
  logVerbose("jwtCircuit.verifyJwtCircuitProof.time_window.pass");

  logBasic("jwtCircuit.verifyJwtCircuitProof.step", { step: 2, name: "server_side_hashes" });
  try {
    await validateServerSideHashes(publicInputs);
  } catch (err) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "SERVER_SIDE_HASH_VALIDATION", message: err.message });
    throw err;
  }
  logVerbose("jwtCircuit.verifyJwtCircuitProof.server_side_hashes.pass");

  logBasic("jwtCircuit.verifyJwtCircuitProof.step", { step: 3, name: "replay_revocation" });
  if (await isJwtProofReplay(nullifier, currentTime)) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "PROOF_REPLAY_DETECTED", nullifierPrefix: nullifier.slice(0, 12) + "…", currentTime });
    throw new Error("PROOF_REPLAY_DETECTED");
  }
  if (await isNullifierRevoked(nullifier)) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "NULLIFIER_REVOKED", nullifierPrefix: nullifier.slice(0, 12) + "…" });
    throw new Error("NULLIFIER_REVOKED");
  }
  logVerbose("jwtCircuit.verifyJwtCircuitProof.replay_revocation.pass");

  logBasic("jwtCircuit.verifyJwtCircuitProof.step", { step: 4, name: "groth16_verify" });
  const snarkjs = require("snarkjs");
  const vkey = loadVerificationKey();
  const hasIC = Array.isArray(vkey.IC) && vkey.IC.length >= 2;
  logVerbose("jwtCircuit.verifyJwtCircuitProof.vkey", { nPublic: vkey.nPublic, hasIC, icLen: vkey.IC?.length });
  if (!hasIC) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "JWT_CIRCUIT_VKEY_INVALID" });
    throw new Error("JWT_CIRCUIT_VKEY_INVALID");
  }
  if (vkey.nPublic >= 69) {
    const hasModulus = Array.isArray(publicInputs.modulus) && publicInputs.modulus.length === 32;
    const hasExpRsa = Array.isArray(publicInputs.expRsa) && publicInputs.expRsa.length === 32;
    if (!hasModulus || !hasExpRsa) {
      logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "RSA_PUBLIC_INPUTS_MISSING", hasModulus, hasExpRsa });
      throw new Error("INVALID_JWT_CIRCUIT_PAYLOAD");
    }
  }
  const publicSignals = buildPublicSignals(publicInputs, publicOutputs, vkey);
  logVerbose("jwtCircuit.verifyJwtCircuitProof.publicSignals_built", { isArray: Array.isArray(publicSignals), length: publicSignals?.length, firstLen: publicSignals?.[0]?.length });
  if (!Array.isArray(publicSignals) || publicSignals.length < 1) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "invalid_publicSignals_array" });
    throw new Error("INVALID_JWT_CIRCUIT_PAYLOAD");
  }
  let isValid;
  try {
    logVerbose("jwtCircuit.verifyJwtCircuitProof.snarkjs_verify_calling", { publicSignalsLength: publicSignals.length });
    isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    logBasic("jwtCircuit.verifyJwtCircuitProof.snarkjs_verify_result", { isValid });
  } catch (err) {
    const msg = err?.message || String(err);
    logBasic("jwtCircuit.verifyJwtCircuitProof.snarkjs_error", { message: msg });
    if (/undefined.*reading\s+['"]0['"]/.test(msg) || msg.includes("fromObject")) {
      throw new Error("INVALID_JWT_CIRCUIT_PAYLOAD");
    }
    throw err;
  }
  if (!isValid) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "INVALID_PROOF" });
    throw new Error("INVALID_PROOF");
  }
  logVerbose("jwtCircuit.verifyJwtCircuitProof.groth16.pass");

  logBasic("jwtCircuit.verifyJwtCircuitProof.step", { step: 5, name: "mark_jwt_proof_used" });
  await markJwtProofUsed(nullifier, currentTime);
  logBasic("jwtCircuit.verifyJwtCircuitProof.success", { nullifierPrefix: nullifier.slice(0, 16) + "…" });
  logVerbose("jwtCircuit.verifyJwtCircuitProof.done", { nullifierLen: nullifier.length });
  return { valid: true, nullifierHash: nullifier };
}

/**
 * Detect if req.body is JWT-circuit payload (proof + publicInputs + publicOutputs, no merkleTreeRoot).
 */
function isJwtCircuitPayload(body) {
  if (!body || typeof body !== "object" || body.merkleTreeRoot !== undefined) return false;
  const hasProof = body.proof != null && typeof body.proof === "object";
  const hasInputs = body.publicInputs != null && typeof body.publicInputs === "object";
  const hasOutputs = body.publicOutputs != null && typeof body.publicOutputs === "object" && body.publicOutputs.nullifier != null;
  return hasProof && hasInputs && hasOutputs;
}

module.exports = {
  verifyJwtCircuitProof,
  isJwtCircuitPayload,
  loadVerificationKey,
  TIME_SKEW_SECONDS
};
