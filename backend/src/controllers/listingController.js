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
async function checkImageIsAI(req) {
  const apiUser = process.env.SIGHTENGINE_API_USER?.trim();
  const apiSecret = process.env.SIGHTENGINE_API_SECRET?.trim();
  const threshold = parseFloat(process.env.AI_IMAGE_THRESHOLD) || 0.5;

  if (!apiUser || !apiSecret) {
    console.warn("[SightEngine] WARNING: Credentials missing → skipping check");
    return false;
  }

  let mediaInput = null;
  if (req.file && req.file.buffer) {
    mediaInput = { type: "buffer", value: req.file.buffer };
  } else if (req.body) {
    const url = req.body.image_url || req.body.url || req.body.image;
    if (typeof url === "string" && url.startsWith("http")) {
      mediaInput = { type: "url", value: url };
    }
  }

  if (!mediaInput) return false;

  return new Promise((resolve) => {
    const boundary = "----SightEngineForm" + Date.now().toString(36);
    const parts = [];

    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="models"\r\n\r\ngenai\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="api_user"\r\n\r\n${apiUser}\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="api_secret"\r\n\r\n${apiSecret}\r\n`));

    if (mediaInput.type === "buffer") {
      const mimeType = req.file.mimetype || "image/jpeg";
      const originalName = req.file.originalname || "upload.jpg";
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${originalName}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
      parts.push(mediaInput.value);
    } else {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="url"\r\n\r\n${mediaInput.value}\r\n`));
    }

    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const reqHttp = require("https").request({
      hostname: "api.sightengine.com",
      path: "/1.0/check.json",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          if (!data.trim().startsWith("{")) return resolve(false);
          const result = JSON.parse(data);
          if (result.status !== "success") return resolve(false);

          const aiScore = result.type?.ai_generated || 0;
          console.log(`[SightEngine] AI score: ${aiScore.toFixed(4)}`);
          resolve(aiScore >= threshold);
        } catch (e) {
          console.warn("[SightEngine] Parse error");
          resolve(false);
        }
      });
    });

    reqHttp.on("error", () => resolve(false));
    reqHttp.setTimeout(15000, () => { reqHttp.destroy(); resolve(false); });
    reqHttp.write(body);
    reqHttp.end();
  });
}

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
    try {
      // AI check
      if (req.file || (req.body && (req.body.image_url || req.body.url || req.body.image))) {
        const isAI = await checkImageIsAI(req);
        if (isAI) {
          return res.status(400).json({ 
            error: "Upload failed – this image appears to be AI-generated" 
          });
        }
      }

      if (req.file) {
        const userDir = path.join(process.cwd(), "uploads", ownerId);
        await fs.promises.mkdir(userDir, { recursive: true });
        const ext = path.extname(req.file.originalname) || "";
        const filename = `${Date.now()}${ext}`;
        const filePath = path.join(userDir, filename);
        await fs.promises.writeFile(filePath, req.file.buffer);
        image_url = `/uploads/${ownerId}/${filename}`;
      }

      const row = await createListing(ownerId, { title, description, price, category, condition, image_url, location });
      res.status(201).json(row);
    } catch (err) {
      console.error("[Listing Create Error]", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "LISTING_CREATE_FAILED" });
      }
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
    try {
      if (req.file || (req.body && (req.body.image_url || req.body.url || req.body.image))) {
        const isAI = await checkImageIsAI(req);
        if (isAI) {
          return res.status(400).json({ 
            error: "Upload failed – this image appears to be AI-generated" 
          });
        }
      }

      if (req.file) {
        const userDir = path.join(process.cwd(), "uploads", ownerId);
        await fs.promises.mkdir(userDir, { recursive: true });
        const ext = path.extname(req.file.originalname) || "";
        const filename = `${Date.now()}${ext}`;
        const filePath = path.join(userDir, filename);
        await fs.promises.writeFile(filePath, req.file.buffer);
        image_url = `/uploads/${ownerId}/${filename}`;
      }

      const row = await updateListing(ownerId, listingId, { title, description: description ?? null, price, category, condition, image_url, location });
      if (row) {
        res.json(row);
      } else {
        res.status(404).json({ error: "LISTING_NOT_FOUND" });
      }
    } catch (err) {
      console.error("[Listing Update Error]", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "LISTING_UPDATE_FAILED" });
      }
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