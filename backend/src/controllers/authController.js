const jwt = require("jsonwebtoken");
const { verifyAccessProof } = require("../services/zkpService");
const { uscGroup } = require("../services/groupManager");
const { verifyUSCGoogleToken } = require("../services/googleAuth");
const { saveBackup, getBackup } = require("../models/identityBackup");
const { JWT_EXPIRY } = require("../../../shared/constants");
const { logBasic, logVerbose } = require("../config/logger");

const KEY_HASH_REGEX = /^[a-f0-9]{64}$/i;

function isUSCEmail(email = "") {
  return typeof email === "string" && email.toLowerCase().endsWith("@usc.edu");
}

/**
 * Enroll: accept either (idToken + identityCommitment) or (email + identityCommitment).
 * - Google path: verify idToken (hd=usc.edu); we never read or store email/sub.
 * - Dev path: check email suffix only; we never store email.
 */
async function enroll(req, res) {
  logBasic("auth.enroll started");
  try {
    const { idToken, email, identityCommitment } = req.body || {};
    logVerbose("auth.enroll payload keys", {
      hasIdToken: !!idToken,
      hasEmail: email !== undefined,
      hasIdentityCommitment: !!identityCommitment
    });
    if (!identityCommitment) {
      logBasic("auth.enroll rejected", { reason: "MISSING_IDENTITY_COMMITMENT" });
      return res.status(400).json({ error: "MISSING_IDENTITY_COMMITMENT" });
    }

    if (idToken) {
      logVerbose("auth.enroll verifying Google token");
      await verifyUSCGoogleToken(idToken);
      // No PII read or stored; commitment only
    } else if (email !== undefined) {
      if (!isUSCEmail(email)) {
        logBasic("auth.enroll rejected", { reason: "USC_EMAIL_REQUIRED" });
        return res.status(403).json({ error: "USC_EMAIL_REQUIRED" });
      }
      // Dev path: we still never store email
    } else {
      logBasic("auth.enroll rejected", { reason: "MISSING_ID_TOKEN_OR_EMAIL" });
      return res.status(400).json({ error: "MISSING_ID_TOKEN_OR_EMAIL" });
    }

    const added = await uscGroup.addMember(identityCommitment);
    logBasic("auth.enroll success", { added, root: uscGroup.getRoot().slice(0, 16) + "…" });
    return res.status(added ? 201 : 200).json({
      enrolled: true,
      alreadyEnrolled: !added,
      root: uscGroup.getRoot()
    });
  } catch (error) {
    logBasic("auth.enroll error", { message: error.message });
    const msg = error.message || "UNKNOWN_ERROR";
    if (msg === "USC_GOOGLE_REQUIRED") {
      return res.status(403).json({ error: msg });
    }
    return res.status(500).json({ error: msg });
  }
}

async function verifyProof(req, res) {
  logBasic("auth.verifyProof started");
  try {
    const { stableId, ...proofData } = req.body;
    logVerbose("auth.verifyProof", {
      hasStableId: !!stableId,
      proofKeys: Object.keys(proofData || {})
    });
    const verification = await verifyAccessProof(proofData, uscGroup.getRoot());
    logBasic("auth.verifyProof proof valid");
    // Cross-session identity: sub is client-derived stable pseudonym (same identity → same sub)
    const token = jwt.sign(
      { sub: stableId, nullifierHash: verification.nullifierHash },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: JWT_EXPIRY }
    );
    logBasic("auth.verifyProof success", { subPrefix: stableId ? String(stableId).slice(0, 8) + "…" : "" });
    return res.json({ token, expiresIn: JWT_EXPIRY });
  } catch (error) {
    const message = error.message || "UNKNOWN_ERROR";
    logBasic("auth.verifyProof error", { message });
    if (
      message.startsWith("STALE_GROUP_ROOT") ||
      message === "PROOF_REPLAY_DETECTED" ||
      message === "INVALID_PROOF" ||
      message === "INVALID_SIGNAL" ||
      message === "NULLIFIER_REVOKED"
    ) {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
}

async function backupIdentity(req, res) {
  const { keyHash, encryptedIdentity } = req.body || {};
  if (!keyHash || !KEY_HASH_REGEX.test(keyHash) || !encryptedIdentity || typeof encryptedIdentity !== "string") {
    return res.status(400).json({ error: "INVALID_BACKUP_PAYLOAD" });
  }
  try {
    await saveBackup(keyHash, encryptedIdentity);
    logBasic("auth.backupIdentity success");
    return res.status(204).send();
  } catch (err) {
    logBasic("auth.backupIdentity error", { message: err.message });
    return res.status(500).json({ error: "BACKUP_FAILED" });
  }
}

async function recoverIdentity(req, res) {
  const { keyHash } = req.body || {};
  if (!keyHash || !KEY_HASH_REGEX.test(keyHash)) {
    return res.status(400).json({ error: "INVALID_RECOVERY_PAYLOAD" });
  }
  try {
    const encrypted = await getBackup(keyHash);
    if (!encrypted) {
      return res.status(404).json({ error: "NO_BACKUP_FOUND" });
    }
    return res.json({ encryptedIdentity: encrypted });
  } catch (err) {
    logBasic("auth.recoverIdentity error", { message: err.message });
    return res.status(500).json({ error: "RECOVERY_FAILED" });
  }
}

module.exports = {
  enroll,
  verifyProof,
  backupIdentity,
  recoverIdentity
};
