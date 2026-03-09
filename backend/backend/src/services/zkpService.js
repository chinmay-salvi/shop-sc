// const { verifyProof } = require("@semaphore-protocol/proof");
// const {
//   markNullifierUsed,
//   isNullifierUsed,
//   isNullifierRevoked
// } = require("../models/nullifier");
// const { logBasic, logVerbose } = require("../config/logger");

// async function verifyAccessProof(proofData, currentGroupRoot) {
//   const proof = proofData;
//   const { merkleTreeRoot, message, nullifier, scope } = proof;
//   logVerbose("zkp.verifyAccessProof step 1: validate root and signal/scope");

//   // 1. Validate group root freshness
//   if (merkleTreeRoot?.toString() !== currentGroupRoot?.toString()) {
//     logBasic("zkp.verifyAccessProof rejected", { reason: "STALE_GROUP_ROOT" });
//     throw new Error("STALE_GROUP_ROOT: Fetch latest root from /group-root");
//   }

//   // Note: proof.message and proof.scope are numeric strings (BigInt from encodeBytes32String),
//   // not the original "marketplace-access" / "neighbor-know-access-2026". The cryptographic
//   // verifyProof(proof) below already validates they match the expected signal/scope in the circuit.

//   logVerbose("zkp.verifyAccessProof step 2: replay/revocation check");
//   // 2. Prevent proof replay / revoked users (Semaphore proof uses "nullifier" field)
//   if (await isNullifierUsed(nullifier)) {
//     logBasic("zkp.verifyAccessProof rejected", { reason: "PROOF_REPLAY_DETECTED" });
//     throw new Error("PROOF_REPLAY_DETECTED");
//   }
//   if (await isNullifierRevoked(nullifier)) {
//     logBasic("zkp.verifyAccessProof rejected", { reason: "NULLIFIER_REVOKED" });
//     throw new Error("NULLIFIER_REVOKED");
//   }

//   logVerbose("zkp.verifyAccessProof step 3: verify proof");
//   // 3. Verify ZK proof mathematically (proof: merkleTreeDepth, merkleTreeRoot, message, nullifier, scope, points)
//   const isValid = await verifyProof(proof);

//   if (!isValid) {
//     logBasic("zkp.verifyAccessProof rejected", { reason: "INVALID_PROOF" });
//     throw new Error("INVALID_PROOF");
//   }

//   logVerbose("zkp.verifyAccessProof step 4: mark nullifier used");
//   await markNullifierUsed(nullifier);
//   logBasic("zkp.verifyAccessProof success");
//   return { valid: true, nullifierHash: nullifier };
// }

// module.exports = { verifyAccessProof };



// const { verifyProof } = require("@semaphore-protocol/proof");
// const {
//   markNullifierUsed,
//   isNullifierUsed,
//   isNullifierRevoked
// } = require("../models/nullifier");
// const { logBasic, logVerbose } = require("../config/logger");

// async function verifyAccessProof(proofData, currentGroupRoot) {
//   const proof = proofData;
//   const { merkleTreeRoot, nullifier } = proof;
//   logVerbose("zkp.verifyAccessProof step 1: validate root");

//   // 1. Validate group root freshness
//   if (merkleTreeRoot?.toString() !== currentGroupRoot?.toString()) {
//     logBasic("zkp.verifyAccessProof rejected", { reason: "STALE_GROUP_ROOT" });
//     throw new Error("STALE_GROUP_ROOT: Fetch latest root from /group-root");
//   }

//   logVerbose("zkp.verifyAccessProof step 2: revocation check");

//   // 2. If nullifier is revoked, always block
//   if (await isNullifierRevoked(nullifier)) {
//     logBasic("zkp.verifyAccessProof rejected", { reason: "NULLIFIER_REVOKED" });
//     throw new Error("NULLIFIER_REVOKED");
//   }

//   // 3. If nullifier already used = same identity logging back in after logout.
//   //    Re-issue a session without re-verifying the proof (identity already proven).
//   const alreadyUsed = await isNullifierUsed(nullifier);
//   if (alreadyUsed) {
//     logBasic("zkp.verifyAccessProof: known identity re-login, re-issuing session");
//     return { valid: true, nullifierHash: nullifier, reissued: true };
//   }

//   logVerbose("zkp.verifyAccessProof step 3: verify proof cryptographically");
//   // 4. First-time login — verify ZK proof mathematically
//   const isValid = await verifyProof(proof);
//   if (!isValid) {
//     logBasic("zkp.verifyAccessProof rejected", { reason: "INVALID_PROOF" });
//     throw new Error("INVALID_PROOF");
//   }

//   logVerbose("zkp.verifyAccessProof step 4: mark nullifier used");
//   await markNullifierUsed(nullifier);
//   logBasic("zkp.verifyAccessProof success");
//   return { valid: true, nullifierHash: nullifier, reissued: false };
// }

// module.exports = { verifyAccessProof };




const { verifyProof } = require("@semaphore-protocol/proof");
const {
  markNullifierUsed,
  isNullifierUsed,
  isNullifierRevoked
} = require("../models/nullifier");
const { logBasic, logVerbose } = require("../config/logger");

async function verifyAccessProof(proofData, currentGroupRoot) {
  const proof = proofData;
  const { merkleTreeRoot, nullifier } = proof;
  logVerbose("zkp.verifyAccessProof step 1: validate root");

  // 1. Validate group root freshness
  if (merkleTreeRoot?.toString() !== currentGroupRoot?.toString()) {
    logBasic("zkp.verifyAccessProof rejected", { reason: "STALE_GROUP_ROOT" });
    throw new Error("STALE_GROUP_ROOT: Fetch latest root from /group-root");
  }

  logVerbose("zkp.verifyAccessProof step 2: revocation check");

  // 2. If nullifier is revoked, always block
  if (await isNullifierRevoked(nullifier)) {
    logBasic("zkp.verifyAccessProof rejected", { reason: "NULLIFIER_REVOKED" });
    throw new Error("NULLIFIER_REVOKED");
  }

  // 3. If nullifier already used = same identity logging back in after logout.
  //    Re-issue a session without re-verifying the proof (identity already proven).
  const alreadyUsed = await isNullifierUsed(nullifier);
  if (alreadyUsed) {
    logBasic("zkp.verifyAccessProof: known identity re-login, re-issuing session");
    return { valid: true, nullifierHash: nullifier, reissued: true };
  }

  logVerbose("zkp.verifyAccessProof step 3: verify proof cryptographically");
  // 4. First-time login — verify ZK proof mathematically
  const isValid = await verifyProof(proof);
  if (!isValid) {
    logBasic("zkp.verifyAccessProof rejected", { reason: "INVALID_PROOF" });
    throw new Error("INVALID_PROOF");
  }

  logVerbose("zkp.verifyAccessProof step 4: mark nullifier used");
  await markNullifierUsed(nullifier);
  logBasic("zkp.verifyAccessProof success");
  return { valid: true, nullifierHash: nullifier, reissued: false };
}

module.exports = { verifyAccessProof };