const express = require("express");
const authRoutes = require("./auth");
const listingsRoutes = require("./listings");
const chatRoutes = require("./chat");
const rewardsRoutes = require("./rewards");
const { getGroupRoot, getGroup } = require("../controllers/groupController");
const aiChatRoutes = require("./aiChat");


const router = express.Router();

router.get("/health", (_req, res) => res.json({ ok: true }));
router.get("/group-root", getGroupRoot);
router.get("/group", getGroup);
router.use("/auth", authRoutes);
router.use("/listings", listingsRoutes);
router.use("/chats", chatRoutes);
router.use("/ai-chat", aiChatRoutes);

router.use("/rewards", rewardsRoutes);

module.exports = router;
