const STABLE_ID_REGEX = /^[a-f0-9]{64}$/i;

function validateProofPayload(req, res, next) {
  const { stableId, merkleTreeDepth, merkleTreeRoot, message, nullifier, scope, points } = req.body || {};
  if (
    !merkleTreeDepth ||
    !merkleTreeRoot ||
    !message ||
    !nullifier ||
    !scope ||
    !Array.isArray(points)
  ) {
    return res.status(400).json({ error: "INVALID_PROOF_PAYLOAD" });
  }
  if (!stableId || typeof stableId !== "string" || !STABLE_ID_REGEX.test(stableId)) {
    return res.status(400).json({ error: "INVALID_STABLE_ID" });
  }
  return next();
}

module.exports = {
  validateProofPayload
};
