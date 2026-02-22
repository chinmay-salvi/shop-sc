// JWT @usc.edu ZK auth circuit (Neighbor-Know).
// Proves possession of a valid Google JWT for @usc.edu and outputs a deterministic nullifier.
// Private: sub, exp, audHash, and validity flags (signature/email); Public: pepper, time, expectedAudHash, googleKeyHash.
// Output: nullifier = Poseidon(sub, pepper) for cross-session identity.
//
// NOTE: Signature verification is currently a placeholder (signatureValid private input).
// Production must integrate RSA-2048 in-circuit (e.g. circom-rsa); see docs/zk-auth-implementation-plan.md.
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

template JwtUSCMain() {
  // ----- Public inputs (known to verifier) -----
  signal input pepper;
  signal input currentTime;       // Client Unix timestamp
  signal input expectedAudHash;  // Hash of expected aud (Google Client ID)
  signal input googleKeyHash;     // Hash of Google RS256 public key (binding)

  // ----- Private inputs (witness only) -----
  signal input sub;               // Google user ID (21-digit), as field element
  signal input exp;               // JWT exp claim (Unix timestamp)
  signal input audHash;          // Hash of aud claim
  signal input emailSuffixValid; // 1 if email ends with @usc.edu
  signal input signatureValid;   // 1 if JWT signature verified (placeholder for RSA-in-circuit)

  // ----- Public output -----
  signal output nullifier;

  // Validity flags must be 0 or 1
  signal invSig;
  invSig <-- signatureValid == 0 ? 1 : 1/signatureValid;
  signatureValid * (1 - signatureValid) === 0;
  signatureValid === 1;

  signal invEmail;
  invEmail <-- emailSuffixValid == 0 ? 1 : 1/emailSuffixValid;
  emailSuffixValid * (1 - emailSuffixValid) === 0;
  emailSuffixValid === 1;

  // Audience must match
  audHash === expectedAudHash;

  // Token not expired: currentTime < exp (both as 64-bit range; LessThan(64) is safe for Unix timestamps)
  component lt = LessThan(64);
  lt.in[0] <== currentTime;
  lt.in[1] <== exp;
  lt.out === 1;

  // Nullifier = Poseidon(sub, pepper); same user + same pepper => same nullifier every time
  component poseidon = Poseidon(2);
  poseidon.inputs[0] <== sub;
  poseidon.inputs[1] <== pepper;
  nullifier <== poseidon.out;
}

component main = JwtUSCMain();
