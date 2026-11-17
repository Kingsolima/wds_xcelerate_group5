// Verifies the JWTs Neon Auth issues (EdDSA, 15-minute lifetime).
// Docs: https://neon.com/docs/auth/guides/plugins/jwt
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { TokenUser } from './types.ts';

export interface VerifierOptions {
  /** Where the signing keys come from. Tests pass a local key set. */
  keys: JWTVerifyGetKey;
  /** Origin of NEON_AUTH_BASE_URL; Neon uses it as both `iss` and `aud`. */
  origin: string;
}

export type VerifyToken = (token: string) => Promise<TokenUser>;

export function createVerifier({ keys, origin }: VerifierOptions): VerifyToken {
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ['EdDSA'],
      issuer: origin,
      audience: origin,
    });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new Error('token is missing sub or email');
    }
    return {
      id: payload.sub,
      email: payload.email,
      emailVerified: payload.emailVerified === true,
      name: typeof payload.name === 'string' ? payload.name : '',
      banned: payload.banned === true,
    };
  };
}

/** Verifier for the real Neon Auth instance, built from env vars. Keys are fetched once and cached. */
export function neonVerifier(env = process.env): VerifyToken {
  const { NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL } = env;
  if (!NEON_AUTH_BASE_URL || !NEON_AUTH_JWKS_URL) {
    throw new Error('NEON_AUTH_BASE_URL and NEON_AUTH_JWKS_URL must be set. See server/.env.example.');
  }
  return createVerifier({
    keys: createRemoteJWKSet(new URL(NEON_AUTH_JWKS_URL)),
    origin: new URL(NEON_AUTH_BASE_URL).origin,
  });
}
