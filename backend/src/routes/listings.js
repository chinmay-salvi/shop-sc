const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { listMine, listAll, getOne, create, update, remove } = require("../controllers/listingController");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

router.get("/", listAll);
router.get("/mine", authenticate, listMine);
router.get("/:id", getOne);
router.post("/", authenticate, upload.single("image"), create);
router.patch("/:id", authenticate, upload.single("image"), update);
router.delete("/:id", authenticate, remove);

module.exports = router;
