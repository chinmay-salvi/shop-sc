const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const { chat } = require("../controllers/aiChatController");

router.post("/", authenticate, chat);

module.exports = router;