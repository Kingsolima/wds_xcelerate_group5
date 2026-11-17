
import { Router, type RequestHandler } from 'express';
import type { Pool } from 'pg';
import { GroupId, GroupInput } from '../groups/schema.ts';
import {
  createGroup,
  getGroup,
  joinGroup,
  leaveGroup,
} from '../groups/repo.ts';

interface Deps {
  pool: Pool;
  auth: RequestHandler;
}

// Only signed-in students can access roommate groups.
export function groupsRouter({ pool, auth }: Deps): Router {
  const router = Router();

  // Apply authentication to all group endpoints.
  router.use(auth);

  router.use((req, res, next) => {
    if (req.user?.role !== 'student') {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  });

  // POST /api/groups
  router.post('/', async (req, res) => {
    const input = GroupInput.parse(req.body);

    try {
      const group = await createGroup(pool, input, req.user!.id);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof Error && error.message === 'listing_not_found') {
        res.status(404).json({ error: 'listing_not_found' });
        return;
      }

      if (error instanceof Error && error.message === 'capacity_exceeds_beds') {
        res.status(400).json({ error: 'capacity_exceeds_beds' });
        return;
      }

      throw error;
    }
  });

  // GET /api/groups/:id
  router.get('/:id', async (req, res) => {
    const parsed = GroupId.safeParse(req.params.id);

    if (!parsed.success) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const group = await getGroup(pool, parsed.data);

    if (!group) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.json(group);
  });

  // POST /api/groups/:id/join
  router.post('/:id/join', async (req, res) => {
    const parsed = GroupId.safeParse(req.params.id);

    if (!parsed.success) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const result = await joinGroup(pool, parsed.data, req.user!.id);

    if (!result.ok) {
      const status = result.reason === 'not_found' ? 404 : 409;
      res.status(status).json({ error: result.reason });
      return;
    }

    res.json({ message: 'Successfully joined group' });
  });

  // POST /api/groups/:id/leave
  router.post('/:id/leave', async (req, res) => {
    const parsed = GroupId.safeParse(req.params.id);

    if (!parsed.success) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const result = await leaveGroup(pool, parsed.data, req.user!.id);

    if (!result.ok) {
      const status =
        result.reason === 'not_found' ? 404 :
        result.reason === 'creator_cannot_leave' ? 403 : 409;

      res.status(status).json({ error: result.reason });
      return;
    }

    res.json({ message: 'Successfully left group' });
  });

  return router;
}
