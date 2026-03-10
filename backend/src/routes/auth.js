const express = require("express");
const { enroll, verifyProof, backupIdentity, recoverIdentity } = require("../controllers/authController");
const { validateProofPayload } = require("../middleware/validateProof");

const router = express.Router();

router.post("/enroll", enroll);
router.post("/verify-proof", validateProofPayload, verifyProof);
router.post("/backup-identity", backupIdentity);
router.post("/recover-identity", recoverIdentity);

module.exports = router;
