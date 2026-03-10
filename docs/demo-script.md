# Demo I Script (3 minutes)

## Legacy flow (Semaphore)

1. Show enrollment with `@usc.edu` email and explain trusted anchor tradeoff.
2. Show browser identity generation and local storage (no private key leaves client).
3. Show `/api/group-root` + proof generation/loading state.
4. Submit proof to `/api/auth/verify-proof`, receive JWT.
5. Explain privacy invariant: DB stores only commitments/nullifiers/roots.

## JWT ZK flow (when `NEXT_PUBLIC_USE_JWT_ZK_LOGIN=true`)

If Google sign-in shows 403 “origin is not allowed”, see [google-oauth-setup.md](./google-oauth-setup.md).

1. Sign in with Google (@usc.edu); id_token stays in browser only.
2. (When prover is wired) Show "Generating ZK proof…"; then proof + public I/O sent to `/api/auth/verify-proof`.
3. Backend verifies proof, issues JWT with `sub` = nullifier (no PII). No enrollment step.
4. See [zk-auth-architecture.md](./zk-auth-architecture.md) and [zk-auth-implementation-plan.md](./zk-auth-implementation-plan.md).
