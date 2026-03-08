const { pool } = require("../config/database");

async function saveBackup(keyHash, encryptedIdentity) {
  await pool.query(
    `INSERT INTO identity_backups (key_hash, encrypted_identity)
     VALUES ($1, $2)
     ON CONFLICT (key_hash) DO UPDATE SET encrypted_identity = $2`,
    [keyHash, encryptedIdentity]
  );
}

async function getBackup(keyHash) {
  const result = await pool.query(
    "SELECT encrypted_identity FROM identity_backups WHERE key_hash = $1",
    [keyHash]
  );
  return result.rows[0]?.encrypted_identity || null;
}

module.exports = { saveBackup, getBackup };
