const { pool } = require("../config/database");

async function sendMessage(senderId, recipientId, body) {
  const result = await pool.query(
    `INSERT INTO messages (sender_id, recipient_id, body)
     VALUES ($1, $2, $3)
     RETURNING id, sender_id, recipient_id, body, created_at`,
    [senderId, recipientId, body]
  );
  return result.rows[0];
}

async function getConversation(userId, otherId) {
  const result = await pool.query(
    `SELECT id, sender_id, recipient_id, body, created_at
     FROM messages
     WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
     ORDER BY created_at ASC`,
    [userId, otherId]
  );
  return result.rows;
}

async function getConversationPartners(userId) {
  const result = await pool.query(
    `SELECT DISTINCT CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS partner_id
     FROM messages
     WHERE sender_id = $1 OR recipient_id = $1
     ORDER BY partner_id`,
    [userId]
  );
  return result.rows.map((r) => r.partner_id);
}

module.exports = {
  sendMessage,
  getConversation,
  getConversationPartners
};
