const { isJwtCircuitPayload } = require("../services/jwtCircuitService");
const { logBasic } = require("../config/logger");

const STABLE_ID_REGEX = /^[a-f0-9]{64}$/i;

function validateSemaphorePayload(body) {
  const { stableId, merkleTreeDepth, merkleTreeRoot, message, nullifier, scope, points } = body || {};
  if (
    !merkleTreeDepth ||
    !merkleTreeRoot ||
    !message ||
    !nullifier ||
    !scope ||
    !Array.isArray(points)
  ) {
    return false;
  }
  if (!stableId || typeof stableId !== "string" || !STABLE_ID_REGEX.test(stableId)) {
    return false;
  }
  return true;
}

function validateJwtCircuitPayload(body) {
  if (!body || typeof body.proof !== "object" || !body.publicInputs || !body.publicOutputs) {
    return false;
  }
  const { pepper, currentTime, expectedAudHash, googleKeyHash } = body.publicInputs;
  const { nullifier } = body.publicOutputs;
  return (
    pepper != null &&
    currentTime != null &&
    expectedAudHash != null &&
    googleKeyHash != null &&
    nullifier != null
  );
}

function validateProofPayload(req, res, next) {
  const body = req.body || {};
  logBasic("validateProof.entry", {
    bodyKeys: body ? Object.keys(body) : [],
    hasProof: !!body?.proof,
    proofKeys: body?.proof && typeof body.proof === "object" ? Object.keys(body.proof) : [],
    hasPublicInputs: !!body?.publicInputs,
    publicInputsKeys: body?.publicInputs ? Object.keys(body.publicInputs) : [],
    hasPublicOutputs: !!body?.publicOutputs,
    publicOutputsKeys: body?.publicOutputs ? Object.keys(body.publicOutputs) : []
  });
  if (isJwtCircuitPayload(body)) {
    logBasic("validateProof.isJwtCircuitPayload", { result: true });
    const jwtValid = validateJwtCircuitPayload(body);
    logBasic("validateProof.validateJwtCircuitPayload", {
      result: jwtValid,
      hasPepper: body.publicInputs?.pepper != null,
      hasCurrentTime: body.publicInputs?.currentTime != null,
      hasExpectedAudHash: body.publicInputs?.expectedAudHash != null,
      hasGoogleKeyHash: body.publicInputs?.googleKeyHash != null,
      hasNullifier: body.publicOutputs?.nullifier != null
    });
    if (!jwtValid) {
      logBasic("validateProof.reject", { reason: "INVALID_JWT_CIRCUIT_PAYLOAD", step: "validateJwtCircuitPayload" });
      return res.status(400).json({ error: "INVALID_JWT_CIRCUIT_PAYLOAD" });
    }
    req.jwtCircuit = true;
    logBasic("validateProof.pass", { type: "jwtCircuit" });
    return next();
  }
  if (validateSemaphorePayload(body)) {
    logBasic("validateProof.pass", { type: "semaphore" });
    return next();
  }
  logBasic("validateProof.reject", { reason: "INVALID_PROOF_PAYLOAD", step: "no matching payload" });
  return res.status(400).json({ error: "INVALID_PROOF_PAYLOAD" });
}

module.exports = {
  validateProofPayload
};
