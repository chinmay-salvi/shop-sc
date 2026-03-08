const { pool } = require("../config/database");

async function loadGroupFromDB() {
  const result = await pool.query(
    "SELECT commitment FROM identity_commitments ORDER BY id ASC"
  );
  return result.rows;
}

async function saveGroupToDB(commitment) {
  const normalized = commitment.toString();
  await pool.query(
    `INSERT INTO identity_commitments (commitment)
     VALUES ($1)
     ON CONFLICT (commitment) DO NOTHING`,
    [normalized]
  );
}

module.exports = {
  loadGroupFromDB,
  saveGroupToDB
};
