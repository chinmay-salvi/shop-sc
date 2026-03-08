const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { listConversations, getMessages, postMessage } = require("../controllers/chatController");

const router = express.Router();

router.use(authenticate);
router.get("/conversations", listConversations);
router.get("/messages", getMessages);
router.post("/messages", postMessage);

module.exports = router;
