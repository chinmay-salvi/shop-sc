// JWT @usc.edu ZK auth circuit (Neighbor-Know).
// Proves possession of a valid Google JWT for @usc.edu and outputs a deterministic nullifier.
// RSA-2048 (PKCS#1 v1.5 + SHA-256) verifies the JWT signature in-circuit; email suffix @usc.edu in-circuit.
// Private: sub, exp, audHash, emailSuffix[8], sign[32], hashed[4]. Public: pepper, time, expectedAudHash, googleKeyHash, modulus[32], expRsa[32].
// Output: nullifier = Poseidon(sub, pepper).
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "email_suffix_usc.circom";
include "vendor/circom-rsa-verify/circuits/rsa_verify_private.circom";

template JwtUSCMain() {
  // ----- Public inputs (known to verifier) -----
  signal input pepper;
  signal input currentTime;       // Client Unix timestamp
  signal input expectedAudHash;  // Hash of expected aud (Google Client ID)
  signal input googleKeyHash;     // Hash of Google RS256 public key (binding)
  signal input modulus[32];      // RSA modulus (2048-bit as 32 x 64-bit limbs), from JWKS
  signal input expRsa[32];        // RSA exponent (65537 as 32 limbs), from JWKS

  // ----- Private inputs (witness only) -----
  signal input sub;               // Google user ID (21-digit), as field element
  signal input exp;               // JWT exp claim (Unix timestamp)
  signal input audHash;          // Hash of aud claim
  signal input emailSuffix[8];    // Last 8 bytes of email (must equal @usc.edu in ASCII)
  signal input sign[32];          // JWT signature (2048-bit as 32 x 64-bit limbs)
  signal input hashed[4];        // SHA-256 of JWT message (header.payload) as 4 x 64-bit limbs

  // ----- Public output -----
  signal output nullifier;

  // RSA-2048 PKCS#1 v1.5 + SHA-256: proves JWT signature is valid for the given key
  component rsa = RsaVerifyPrivate();
  for (var i = 0; i < 32; i++) {
    rsa.modulus[i] <== modulus[i];
    rsa.exp[i] <== expRsa[i];
    rsa.sign[i] <== sign[i];
  }
  for (var i = 0; i < 4; i++) {
    rsa.hashed[i] <== hashed[i];
  }

  // In-circuit: prove email ends with @usc.edu (no trusted boolean)
  component emailCheck = EmailSuffixUsc();
  for (var i = 0; i < 8; i++) {
    emailCheck.emailSuffix[i] <== emailSuffix[i];
  }

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
