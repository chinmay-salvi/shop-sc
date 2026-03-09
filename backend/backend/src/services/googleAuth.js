// /**
//  * Verify Google ID token for USC (@usc.edu) enrollment.
//  * We only validate signature and required claims (iss, aud, exp, hd, email_verified).
//  * We do NOT read, log, or store email or sub — PII stays out of our system.
//  */
// const { OAuth2Client } = require("google-auth-library");

// const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
// const REQUIRED_HD = "usc.edu";

// async function verifyUSCGoogleToken(idToken) {
//   if (!GOOGLE_CLIENT_ID) {
//     throw new Error("GOOGLE_CLIENT_ID not configured");
//   }
//   const client = new OAuth2Client(GOOGLE_CLIENT_ID);
//   const ticket = await client.verifyIdToken({
//     idToken,
//     audience: GOOGLE_CLIENT_ID
//   });
//   const payload = ticket.getPayload();
//   // Only read claims we need for policy; never read or persist email/sub
//   const hd = payload.hd;
//   const emailVerified = payload.email_verified === true;
//   if (hd !== REQUIRED_HD || !emailVerified) {
//     throw new Error("USC_GOOGLE_REQUIRED");
//   }
//   return { valid: true };
// }

// module.exports = { verifyUSCGoogleToken };




/**
 * Verify Google access token for USC (@usc.edu) enrollment.
 * Uses Google's tokeninfo endpoint — works with access tokens from implicit flow.
 * We only check hd (hosted domain) and email_verified. No PII is stored.
 */

const REQUIRED_DOMAIN = "usc.edu";

async function verifyUSCGoogleToken(accessToken) {
  if (!accessToken) throw new Error("MISSING_ACCESS_TOKEN");

  // Call Google's userinfo endpoint with the access token
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`GOOGLE_USERINFO_FAILED: ${res.status}`);
  }

  const info = await res.json();

  // Verify USC domain — check hd claim or email suffix
  const email = (info.email || "").toLowerCase();
  const hd = info.hd || "";
  const emailVerified = info.email_verified === true;

  if (!emailVerified) {
    throw new Error("USC_EMAIL_NOT_VERIFIED");
  }

  if (hd !== REQUIRED_DOMAIN && !email.endsWith("@usc.edu")) {
    throw new Error("USC_GOOGLE_REQUIRED");
  }

  // Return minimal info — we never log or store email/sub
  return { valid: true };
}

module.exports = { verifyUSCGoogleToken };