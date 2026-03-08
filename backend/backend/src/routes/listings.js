const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { listMine, listAll, create, update, remove } = require("../controllers/listingController");

const router = express.Router();

router.get("/", listAll);
router.get("/mine", authenticate, listMine);
router.post("/", authenticate, create);
router.patch("/:id", authenticate, update);
router.delete("/:id", authenticate, remove);

module.exports = router;
