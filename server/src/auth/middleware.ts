import type { RequestHandler } from 'express';
import type { Pool } from 'pg';
import type { Role } from './types.ts';
import type { VerifyToken } from './verify.ts';

/** Verified @uwo.ca emails are students; everyone else is a landlord. Admins are set by hand in the DB. */
export function roleForEmail(email: string): Role {
  return email.toLowerCase().endsWith('@uwo.ca') ? 'student' : 'landlord';
}

/** Returns the user's role, creating their profile row the first time we see them. */
export type GetRole = (userId: string, email: string) => Promise<Role>;

export function dbGetRole(pool: Pool): GetRole {
  return async (userId, email) => {
    const { rows } = await pool.query<{ role: Role }>(
      `WITH inserted AS (
         INSERT INTO profiles (user_id, role) VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING
         RETURNING role
       )
       SELECT role FROM inserted
       UNION ALL
       SELECT role FROM profiles WHERE user_id = $1
       LIMIT 1`,
      [userId, roleForEmail(email)],
    );
    if (!rows[0]) throw new Error(`no profile for user ${userId}`);
    return rows[0].role;
  };
}

/**
 * Requires `Authorization: Bearer <Neon Auth JWT>`.
 * 401 for a missing/invalid token; 403 for unverified email or banned users.
 * Sets req.user = { id, email, name, role }.
 */
export function requireAuth(verify: VerifyToken, getRole: GetRole): RequestHandler {
  return async (req, res, next) => {
    const header = req.get('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      res.status(401).json({ error: 'not_signed_in' });
      return;
    }

    let user;
    try {
      user = await verify(token);
    } catch {
      res.status(401).json({ error: 'invalid_token' });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ error: 'email_not_verified' });
      return;
    }
    if (user.banned) {
      res.status(403).json({ error: 'banned' });
      return;
    }

    try {
      const role = await getRole(user.id, user.email);
      req.user = { id: user.id, email: user.email, name: user.name, role };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Use after requireAuth, e.g. requireRole('landlord'). */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  };
}
