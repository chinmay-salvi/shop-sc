# JWT @usc.edu ZK Circuit (Neighbor-Know)

Circuit that proves possession of a valid Google JWT for `@usc.edu` and outputs a deterministic nullifier for cross-session identity. See [zk-auth-architecture.md](../docs/zk-auth-architecture.md) and [zk-auth-implementation-plan.md](../docs/zk-auth-implementation-plan.md).

## Prerequisites

- **circom**: Install from [iden3/circom](https://github.com/iden3/circom#installing) (e.g. `cargo install circom` or download a release).
- **Node.js**: For snarkjs (installed via `npm install` in this directory).

## Quick start

```bash
cd circuits
npm install
npm run build    # Compile circuit to R1CS + WASM (requires circom)
npm run setup    # Trusted setup, export verification_key.json
npm run test     # Generate test proof and verify
npm run copy-to-frontend   # Copy WASM + zkey to frontend/public/zkp for browser prover
```

Then copy the verification key to the backend and enable ZK login:

```bash
cp build/verification_key.json ../backend/src/config/jwt_circuit_vkey.json
# In frontend: set NEXT_PUBLIC_USE_JWT_ZK_LOGIN=true
```

## Layout

- `jwt_usc_main.circom` — Main circuit (Poseidon nullifier, time check, aud/email/signature validity).
- `scripts/build.sh` — Compiles to `build/jwt_usc_main.r1cs` and `build/jwt_usc_main_js/` (WASM + witness generator).
- `scripts/setup.sh` — Groth16 setup; produces `build/verification_key.json` and `build/jwt_usc_main_final.zkey`.
- `scripts/test.sh` — Runs a test proof and verification.

## Circuit I/O

| Role | Name | Description |
|------|------|-------------|
| Public in | pepper | App pepper (high-entropy constant). |
| Public in | currentTime | Client Unix timestamp. |
| Public in | expectedAudHash | Hash of expected `aud` (Google Client ID). |
| Public in | googleKeyHash | Hash of Google RS256 public key. |
| Public in | modulus[32] | RSA modulus (2048-bit as 32×64-bit limbs), from JWKS. |
| Public in | expRsa[32] | RSA exponent (65537 as 32 limbs), from JWKS. |
| Private in | sub | Google user ID (field element). |
| Private in | exp | JWT `exp` claim. |
| Private in | audHash | Hash of `aud` claim. |
| Private in | emailSuffix[8] | Last 8 bytes of email — **in-circuit** constrained to equal `@usc.edu` (ASCII). |
| Private in | sign[32] | JWT signature (2048-bit as 32×64-bit limbs). |
| Private in | hashed[4] | SHA-256 of JWT message (header.payload) as 4×64-bit limbs. |
| Public out | nullifier | Poseidon(sub, pepper) — stable pseudonymous id. |

## In-circuit @usc.edu

The circuit **proves** that the email ends with `@usc.edu`: private input `emailSuffix[8]` is constrained to equal the ASCII bytes `64, 117, 115, 99, 46, 101, 100, 117`. No trusted boolean.

## Production / RSA-in-circuit

- **RSA-2048** is integrated: the circuit uses [circom-rsa-verify](https://github.com/zkp-application/circom-rsa-verify) (vendored under `vendor/circom-rsa-verify`) to verify the JWT signature in-circuit. Public signals: pepper, currentTime, expectedAudHash, googleKeyHash, modulus[32], expRsa[32], nullifier (**69** total). Frontend builds message hash (SHA-256 of `header.payload`), signature/modulus/exp as 64-bit limbs; backend `buildPublicSignals` builds the 69-element array when the vkey has `nPublic >= 69`.
- **Setup** uses a **2^20** powers-of-tau file (circuit has ~537k constraints). `scripts/setup.sh` downloads `powersOfTau28_hez_final_20.ptau` from zkevm (~1.2GB); the first run may take several minutes for download and phase-2 setup.
- Use a proper powers-of-tau ceremony for production (multi-party contribution).
- After setup, copy `build/verification_key.json` to `backend/src/config/jwt_circuit_vkey.json` and run `npm run copy-to-frontend`.
