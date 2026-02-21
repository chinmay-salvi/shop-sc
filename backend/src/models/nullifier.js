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

module.exports = {
  isNullifierUsed,
  markNullifierUsed,
  isNullifierRevoked
};
