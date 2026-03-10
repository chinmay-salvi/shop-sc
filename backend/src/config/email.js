const SENDGRID_KEY = process.env.SENDGRID_KEY || "";
const MOCK_EMAIL_URL = process.env.MOCK_EMAIL_URL || "http://localhost:8025/send";

module.exports = {
  SENDGRID_KEY,
  MOCK_EMAIL_URL
};
