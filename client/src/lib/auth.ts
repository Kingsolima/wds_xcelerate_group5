/*
  Neon Auth in the browser. Sign-up, sign-in and sign-out talk to Neon directly; Express only
  checks the JWT we send it. Set VITE_NEON_AUTH_URL in client/.env (see client/.env.example).
*/
import { createInternalNeonAuth } from '@neon/auth';

const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

/** False when VITE_NEON_AUTH_URL isn't set: browsing still works, signing in doesn't. */
export const authConfigured = Boolean(AUTH_URL);

// createAuthClient() only returns the Better Auth client; this also gives getJWTToken().
const create = (url: string) => createInternalNeonAuth(url);
let neon: ReturnType<typeof create> | undefined;

function neonAuth() {
  if (!AUTH_URL) {
    throw new Error(
      'Sign-in isn’t set up: add VITE_NEON_AUTH_URL to client/.env (see client/.env.example).',
    );
  }
  neon ??= create(AUTH_URL);
  return neon;
}

type AuthResult = Promise<{ error: { message?: string; status?: number } | null }>;

/**
 * Better Auth's email OTP plugin (/email-otp/*). Neon adds the plugin to its client, but the
 * client type createInternalNeonAuth returns leaves plugin methods out, so they're typed here.
 */
type EmailOtp = {
  sendVerificationOtp(body: { email: string; type: 'email-verification' | 'sign-in' | 'forget-password' }): AuthResult;
  verifyEmail(body: { email: string; otp: string }): AuthResult;
};

/** Better Auth client: signIn.email, signUp.email, signOut, getSession, emailOtp.*. */
export const authClient = () => neonAuth().adapter as ReturnType<typeof create>['adapter'] & { emailOtp: EmailOtp };

/** The signed-in user's JWT for `Authorization: Bearer`, or null. Neon caches it until it expires. */
export async function getToken(): Promise<string | null> {
  if (!AUTH_URL) return null;
  return neonAuth().getJWTToken();
}
