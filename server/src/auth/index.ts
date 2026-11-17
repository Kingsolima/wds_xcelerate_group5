import { pool } from '../db.ts';
import { dbGetRole, requireAuth, requireRole } from './middleware.ts';
import { neonVerifier } from './verify.ts';

/**
 * Add to any route that needs a signed-in user; pair with requireRole for role checks:
 *   router.post('/listings', auth, requireRole('landlord'), handler)
 */
export const auth = requireAuth(neonVerifier(), dbGetRole(pool));
export { requireRole };
export type { AuthUser, Role } from './types.ts';
