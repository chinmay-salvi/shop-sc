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
| Private in | sub | Google user ID (field element). |
| Private in | exp | JWT `exp` claim. |
| Private in | audHash | Hash of `aud` claim. |
| Private in | emailSuffixValid | 1 if email ends with @usc.edu. |
| Private in | signatureValid | 1 if JWT signature valid (placeholder; production = RSA-in-circuit). |
| Public out | nullifier | Poseidon(sub, pepper) — stable pseudonymous id. |

## Production

- **RSA-in-circuit**: Replace the `signatureValid` placeholder with real RSA-2048 verification. See **[docs/rsa-in-circuit-plan.md](../docs/rsa-in-circuit-plan.md)** for a step-by-step plan and links to [circom-rsa-verify](https://github.com/zkp-application/circom-rsa-verify) and [zk-jwt](https://github.com/zkemail/zk-jwt). Then re-run trusted setup and export a new verification key.
- Use a proper powers-of-tau ceremony for production (larger ptau, multi-party contribution).
- Copy `build/verification_key.json` to `backend/src/config/jwt_circuit_vkey.json` for the backend verifier.
