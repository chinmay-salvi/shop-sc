/**
 * Verify Google ID token for USC (@usc.edu) enrollment.
 * We only validate signature and required claims (iss, aud, exp, hd, email_verified).
 * We do NOT read, log, or store email or sub — PII stays out of our system.
 */
const { OAuth2Client } = require("google-auth-library");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const REQUIRED_HD = "usc.edu";

async function verifyUSCGoogleToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID not configured");
  }
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  // Only read claims we need for policy; never read or persist email/sub
  const hd = payload.hd;
  const emailVerified = payload.email_verified === true;
  if (hd !== REQUIRED_HD || !emailVerified) {
    throw new Error("USC_GOOGLE_REQUIRED");
  }
  return { valid: true };
}

module.exports = { verifyUSCGoogleToken };
