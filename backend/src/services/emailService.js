const { MOCK_EMAIL_URL } = require("../config/email");

async function sendVerificationEmail(email, code) {
  await fetch(MOCK_EMAIL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: email,
      subject: "shop-sc verification",
      body: `Your verification code is: ${code}`
    })
  });
}

module.exports = {
  sendVerificationEmail
};
