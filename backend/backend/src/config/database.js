const { Pool } = require("pg");

const connectionString = process.env.DB_URL || "postgresql://postgres:postgres@localhost:5432/shop_sc";

const pool = new Pool({ connectionString });

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS identity_commitments (
      id BIGSERIAL PRIMARY KEY,
      commitment TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS used_nullifiers (
      id BIGSERIAL PRIMARY KEY,
      nullifier_hash TEXT UNIQUE NOT NULL,
      used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS revoked_nullifiers (
      id BIGSERIAL PRIMARY KEY,
      nullifier_hash TEXT UNIQUE NOT NULL,
      reason TEXT,
      revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS used_jwt_proofs (
      id BIGSERIAL PRIMARY KEY,
      nullifier_hash TEXT NOT NULL,
      client_time TEXT NOT NULL,
      used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(nullifier_hash, client_time)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id BIGSERIAL PRIMARY KEY,
      owner_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS identity_backups (
      key_hash TEXT PRIMARY KEY,
      encrypted_identity TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

module.exports = {
  pool,
  ensureSchema
};
