export type Role = 'student' | 'landlord' | 'admin';

/** What Neon Auth's JWT tells us about the user. */
export interface TokenUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  banned: boolean;
}

/** The signed-in user, attached to req.user by requireAuth. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
