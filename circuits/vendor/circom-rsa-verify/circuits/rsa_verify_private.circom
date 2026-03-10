// Wrapper: same as RsaVerifyPkcs1v15 but allows sign and hashed to be private (parent decides).
// exp and modulus are typically public so the verifier binds to the RSA key.
pragma circom 2.0.0;

include "./rsa_verify.circom";

template RsaVerifyPrivate() {
  signal input modulus[32];
  signal input exp[32];
  signal input sign[32];
  signal input hashed[4];

  component rsa = RsaVerifyPkcs1v15(64, 32, 17, 4);
  for (var i = 0; i < 32; i++) {
    rsa.modulus[i] <== modulus[i];
    rsa.exp[i] <== exp[i];
    rsa.sign[i] <== sign[i];
  }
  for (var i = 0; i < 4; i++) {
    rsa.hashed[i] <== hashed[i];
  }
}
