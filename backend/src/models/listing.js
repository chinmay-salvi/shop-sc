const { pool } = require("../config/database");

const COLUMNS = "id, owner_id, title, description, price, category, condition, image_url, location, created_at";

async function createListing(ownerId, { title, description, price, category, condition, image_url, location }) {
  const result = await pool.query(
    `INSERT INTO listings (owner_id, title, description, price, category, condition, image_url, location)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLUMNS}`,
    [ownerId, title, description || null, price || null, category || null, condition || null, image_url || null, location || null]
  );
  return result.rows[0];
}

async function getListingsByOwner(ownerId) {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM listings WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [ownerId]
  );
  return result.rows;
}

async function getAllListings() {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM listings WHERE deleted_at IS NULL ORDER BY created_at DESC`
  );
  return result.rows;
}

async function getListingById(id) {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM listings WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateListing(ownerId, listingId, { title, description, price, category, condition, image_url, location }) {
  const result = await pool.query(
    `UPDATE listings SET title = $3, description = $4, price = $5, category = $6, condition = $7, image_url = $8, location = $9
     WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
     RETURNING ${COLUMNS}`,
    [listingId, ownerId, title, description !== undefined ? description : null, price || null, category || null, condition || null, image_url || null, location || null]
  );
  return result.rows[0] || null;
}

async function deleteListing(ownerId, listingId) {
  const result = await pool.query(
    "UPDATE listings SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL RETURNING id",
    [listingId, ownerId]
  );
  return result.rowCount > 0;
}

module.exports = {
  createListing,
  getListingsByOwner,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing
};
