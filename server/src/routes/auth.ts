// Sign-up, sign-in (password or magic link), email verification and sign-out all happen
// in the browser through Neon Auth's client. The API only needs to say who the user is.
import { Router, type RequestHandler } from 'express';

export function authRouter(requireAuth: RequestHandler): Router {
  const router = Router();

  router.get('/me', requireAuth, (req, res) => {
    res.json(req.user);
  });

  return router;
}
