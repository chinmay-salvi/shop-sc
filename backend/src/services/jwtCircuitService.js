/**
 * Verification for JWT @usc.edu ZK circuit (Groth16).
 * Payload: proof + public inputs/outputs; nullifier is the stable pseudonymous user id.
 * See docs/zk-auth-architecture.md and circuits/README.md.
 */
const path = require("path");
const fs = require("fs");
const {
  isJwtProofReplay,
  markJwtProofUsed,
  isNullifierRevoked
} = require("../models/nullifier");
const { logBasic, logVerbose } = require("../config/logger");

const TIME_SKEW_SECONDS = parseInt(process.env.ZKP_TIME_SKEW_SECONDS || "120", 10);
const VKEY_PATH = process.env.JWT_CIRCUIT_VKEY_PATH || path.join(__dirname, "../config/jwt_circuit_vkey.json");

let cachedVkey = null;

function loadVerificationKey() {
  if (cachedVkey) return cachedVkey;
  if (!fs.existsSync(VKEY_PATH)) {
    throw new Error("JWT_CIRCUIT_VKEY_NOT_CONFIGURED: Copy circuits/build/verification_key.json to backend/src/config/jwt_circuit_vkey.json");
  }
  cachedVkey = JSON.parse(fs.readFileSync(VKEY_PATH, "utf8"));
  return cachedVkey;
}

/**
 * Circuit has nPublic=1 (only the nullifier is a public signal). Verification expects [nullifier].
 */
function buildPublicSignals(_publicInputs, publicOutputs) {
  const { nullifier } = publicOutputs;
  return [String(nullifier)];
}

/**
 * Verify JWT-circuit proof, time window, and replay/revocation; mark nullifier used.
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

  const { proof: proofRaw, publicInputs, publicOutputs } = payload;
  if (!proofRaw || !publicInputs || !publicOutputs || !publicOutputs.nullifier) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "missing_top_level", hasProofRaw: !!proofRaw, hasPublicInputs: !!publicInputs, hasPublicOutputs: !!publicOutputs, hasNullifier: !!publicOutputs?.nullifier });
    throw new Error("INVALID_JWT_CIRCUIT_PAYLOAD");
  }
  const proof = proofRaw.proof !== undefined ? proofRaw.proof : proofRaw;
  logBasic("jwtCircuit.verifyJwtCircuitProof.proof_resolved", {
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
  if (Number.isNaN(currentTime)) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "INVALID_TIMESTAMP" });
    throw new Error("INVALID_TIMESTAMP");
  }

  logBasic("jwtCircuit.verifyJwtCircuitProof.step", { step: 1, name: "time_window" });
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - now) > TIME_SKEW_SECONDS) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "TIMESTAMP_OUT_OF_RANGE", currentTime, now, skew: TIME_SKEW_SECONDS });
    throw new Error("TIMESTAMP_OUT_OF_RANGE");
  }

  logBasic("jwtCircuit.verifyJwtCircuitProof.step", { step: 2, name: "replay_revocation" });
  if (await isJwtProofReplay(nullifier, currentTime)) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "PROOF_REPLAY_DETECTED" });
    throw new Error("PROOF_REPLAY_DETECTED");
  }
  if (await isNullifierRevoked(nullifier)) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "NULLIFIER_REVOKED" });
    throw new Error("NULLIFIER_REVOKED");
  }

  logBasic("jwtCircuit.verifyJwtCircuitProof.step", { step: 3, name: "groth16_verify" });
  const snarkjs = require("snarkjs");
  const vkey = loadVerificationKey();
  const hasIC = Array.isArray(vkey.IC) && vkey.IC.length >= 2;
  logBasic("jwtCircuit.verifyJwtCircuitProof.vkey", { hasIC, icLen: vkey.IC?.length });
  if (!hasIC) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "JWT_CIRCUIT_VKEY_INVALID" });
    throw new Error("JWT_CIRCUIT_VKEY_INVALID");
  }
  const publicSignals = buildPublicSignals(publicInputs, publicOutputs);
  logBasic("jwtCircuit.verifyJwtCircuitProof.publicSignals", { isArray: Array.isArray(publicSignals), length: publicSignals?.length, firstLen: publicSignals?.[0]?.length });
  if (!Array.isArray(publicSignals) || publicSignals.length < 1) {
    logBasic("jwtCircuit.verifyJwtCircuitProof.reject", { step: "invalid_publicSignals_array" });
    throw new Error("INVALID_JWT_CIRCUIT_PAYLOAD");
  }
  let isValid;
  try {
    logBasic("jwtCircuit.verifyJwtCircuitProof.snarkjs_verify_calling");
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

  logBasic("jwtCircuit.verifyJwtCircuitProof.step", { step: 4, name: "mark_jwt_proof_used" });
  await markJwtProofUsed(nullifier, currentTime);
  logBasic("jwtCircuit.verifyJwtCircuitProof.success", { nullifierPrefix: nullifier.slice(0, 16) + "…" });
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
