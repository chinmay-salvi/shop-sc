const { pool } = require("../config/database");

async function createListing(ownerId, { title, description }) {
  const result = await pool.query(
    `INSERT INTO listings (owner_id, title, description)
     VALUES ($1, $2, $3)
     RETURNING id, owner_id, title, description, created_at`,
    [ownerId, title, description || null]
  );
  return result.rows[0];
}

async function getListingsByOwner(ownerId) {
  const result = await pool.query(
    "SELECT id, owner_id, title, description, created_at FROM listings WHERE owner_id = $1 ORDER BY created_at DESC",
    [ownerId]
  );
  return result.rows;
}

async function getAllListings() {
  const result = await pool.query(
    "SELECT id, owner_id, title, description, created_at FROM listings ORDER BY created_at DESC"
  );
  return result.rows;
}

async function updateListing(ownerId, listingId, { title, description }) {
  const result = await pool.query(
    `UPDATE listings SET title = $3, description = $4
     WHERE id = $1 AND owner_id = $2
     RETURNING id, owner_id, title, description, created_at`,
    [listingId, ownerId, title, description !== undefined ? description : null]
  );
  return result.rows[0] || null;
}

async function deleteListing(ownerId, listingId) {
  const result = await pool.query(
    "DELETE FROM listings WHERE id = $1 AND owner_id = $2 RETURNING id",
    [listingId, ownerId]
  );
  return result.rowCount > 0;
}

module.exports = {
  createListing,
  getListingsByOwner,
  getAllListings,
  updateListing,
  deleteListing
};
