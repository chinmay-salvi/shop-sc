const { sendMessage, getConversation, getConversationPartners } = require("../models/chat");

const STABLE_ID_REGEX = /^[a-f0-9]{64}$/i;

function listConversations(req, res) {
  const userId = req.user.sub;
  getConversationPartners(userId)
    .then((partners) => res.json({ partners }))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "CONVERSATIONS_FETCH_FAILED" });
    });
}

function getMessages(req, res) {
  const userId = req.user.sub;
  const otherId = req.query.with;
  if (!otherId || !STABLE_ID_REGEX.test(otherId)) {
    return res.status(400).json({ error: "INVALID_WITH_PARAM" });
  }
  getConversation(userId, otherId)
    .then((messages) => res.json({ messages }))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "MESSAGES_FETCH_FAILED" });
    });
}

function postMessage(req, res) {
  const senderId = req.user.sub;
  const { recipient_id, body } = req.body || {};
  if (!recipient_id || !STABLE_ID_REGEX.test(recipient_id)) {
    return res.status(400).json({ error: "INVALID_RECIPIENT_ID" });
  }
  if (!body || typeof body !== "string") {
    return res.status(400).json({ error: "MISSING_BODY" });
  }
  sendMessage(senderId, recipient_id, body.trim())
    .then((msg) => res.status(201).json(msg))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "MESSAGE_SEND_FAILED" });
    });
}

module.exports = {
  listConversations,
  getMessages,
  postMessage
};
