const { pool } = require("../config/database");

async function isNullifierUsed(nullifierHash) {
  const result = await pool.query(
    "SELECT 1 FROM used_nullifiers WHERE nullifier_hash = $1 LIMIT 1",
    [nullifierHash]
  );
  return result.rowCount > 0;
}

async function markNullifierUsed(nullifierHash) {
  await pool.query(
    `INSERT INTO used_nullifiers (nullifier_hash)
     VALUES ($1)
     ON CONFLICT (nullifier_hash) DO NOTHING`,
    [nullifierHash]
  );
}

async function isNullifierRevoked(nullifierHash) {
  const result = await pool.query(
    "SELECT 1 FROM revoked_nullifiers WHERE nullifier_hash = $1 LIMIT 1",
    [nullifierHash]
  );
  return result.rowCount > 0;
}

/** JWT circuit: same nullifier can log in again; we reject only replay of the same (nullifier, currentTime) proof. */
async function isJwtProofReplay(nullifierHash, currentTime) {
  const result = await pool.query(
    "SELECT 1 FROM used_jwt_proofs WHERE nullifier_hash = $1 AND client_time = $2 LIMIT 1",
    [nullifierHash, String(currentTime)]
  );
  return result.rowCount > 0;
}

async function markJwtProofUsed(nullifierHash, currentTime) {
  await pool.query(
    `INSERT INTO used_jwt_proofs (nullifier_hash, client_time)
     VALUES ($1, $2)
     ON CONFLICT (nullifier_hash, client_time) DO NOTHING`,
    [nullifierHash, String(currentTime)]
  );
}

module.exports = {
  isNullifierUsed,
  markNullifierUsed,
  isNullifierRevoked,
  isJwtProofReplay,
  markJwtProofUsed
};
