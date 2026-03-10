const {
  createListing,
  getListingsByOwner,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing
} = require("../models/listing");
const fs = require("fs");
const path = require("path");

function listMine(req, res) {
  const ownerId = req.user.sub;
  getListingsByOwner(ownerId)
    .then((rows) => res.json(rows))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "LISTINGS_FETCH_FAILED" });
    });
}

function listAll(_req, res) {
  getAllListings()
    .then((rows) => res.json(rows))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "LISTINGS_FETCH_FAILED" });
    });
}

function getOne(req, res) {
  const listingId = Number(req.params.id);
  if (!Number.isInteger(listingId) || listingId < 1) {
    return res.status(400).json({ error: "INVALID_ID" });
  }
  getListingById(listingId)
    .then((row) => (row ? res.json(row) : res.status(404).json({ error: "LISTING_NOT_FOUND" })))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "LISTING_FETCH_FAILED" });
    });
}

function create(req, res) {
  const ownerId = req.user.sub;
  let { title, description, price, category, condition, image_url, location } = req.body || {};
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "MISSING_TITLE" });
  }

  (async () => {
    if (req.file) {
      const userDir = path.join(process.cwd(), "uploads", ownerId);
      await fs.promises.mkdir(userDir, { recursive: true });
      const ext = path.extname(req.file.originalname) || "";
      const filename = `${Date.now()}${ext}`;
      const filePath = path.join(userDir, filename);
      await fs.promises.writeFile(filePath, req.file.buffer);
      image_url = `/uploads/${ownerId}/${filename}`;
    }

    try {
      const row = await createListing(ownerId, { title, description, price, category, condition, image_url, location });
      res.status(201).json(row);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "LISTING_CREATE_FAILED" });
    }
  })();
}

function update(req, res) {
  const ownerId = req.user.sub;
  const listingId = Number(req.params.id);
  let { title, description, price, category, condition, image_url, location } = req.body || {};
  if (!Number.isInteger(listingId) || listingId < 1) {
    return res.status(400).json({ error: "INVALID_ID" });
  }
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "MISSING_TITLE" });
  }

  (async () => {
    if (req.file) {
      const userDir = path.join(process.cwd(), "uploads", ownerId);
      await fs.promises.mkdir(userDir, { recursive: true });
      const ext = path.extname(req.file.originalname) || "";
      const filename = `${Date.now()}${ext}`;
      const filePath = path.join(userDir, filename);
      await fs.promises.writeFile(filePath, req.file.buffer);
      image_url = `/uploads/${ownerId}/${filename}`;
    }

    try {
      const row = await updateListing(ownerId, listingId, { title, description: description ?? null, price, category, condition, image_url, location });
      if (row) {
        res.json(row);
      } else {
        res.status(404).json({ error: "LISTING_NOT_FOUND" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "LISTING_UPDATE_FAILED" });
    }
  })();
}

function remove(req, res) {
  const ownerId = req.user.sub;
  const listingId = Number(req.params.id);
  if (!Number.isInteger(listingId) || listingId < 1) {
    return res.status(400).json({ error: "INVALID_ID" });
  }
  deleteListing(ownerId, listingId)
    .then((ok) => (ok ? res.status(204).send() : res.status(404).json({ error: "LISTING_NOT_FOUND" })))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "LISTING_DELETE_FAILED" });
    });
}

module.exports = {
  listMine,
  listAll,
  getOne,
  create,
  update,
  remove
};
