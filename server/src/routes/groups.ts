// Roommate groups API: the posts on the Roommates board, and joining or leaving them.
import { Router, type RequestHandler } from 'express';
import type { Pool } from 'pg';
import { GroupId, GroupInput } from '../groups/schema.ts';
import { createGroup, deleteGroup, getGroup, joinGroup, leaveGroup, listGroups } from '../groups/repo.ts';

interface Deps {
  pool: Pool;
  /** requireAuth middleware (sets req.user). */
  auth: RequestHandler;
}

/** Returns the group id from the URL, or null if it isn't a valid UUID. */
function parseId(id: unknown): string | null {
  const parsed = GroupId.safeParse(id);
  return parsed.success ? parsed.data : null;
}

/** Only students can be in roommate groups. */
const studentsOnly: RequestHandler = (req, res, next) => {
  if (req.user?.role !== 'student') {
    res.status(403).json({ error: 'forbidden', message: 'Only students can join roommate groups' });
    return;
  }
  next();
};

const MESSAGES = {
  listing_not_found: 'That listing isn’t here any more.',
  capacity_exceeds_beds: 'The group is bigger than the number of beds in that place.',
  already_member: 'You’re already in this group.',
  group_full: 'This group is full.',
  not_member: 'You aren’t in this group.',
  creator_cannot_leave: 'You started this group, so you can’t leave it. Delete it instead.',
} as const;

export function groupsRouter({ pool, auth }: Deps): Router {
  const router = Router();

  // Anyone can browse the board.

  // GET /api/groups
  router.get('/', async (_req, res) => {
    res.json(await listGroups(pool));
  });

  // GET /api/groups/:id
  router.get('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const group = id && (await getGroup(pool, id));
    if (!group) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(group);
  });

  // Everything below needs a signed-in user.
  router.use(auth);

  // POST /api/groups
  router.post('/', studentsOnly, async (req, res) => {
    const input = GroupInput.parse(req.body);
    const result = await createGroup(pool, input, req.user!.id);
    if (!result.ok) {
      const status = result.reason === 'listing_not_found' ? 404 : 400;
      res.status(status).json({ error: result.reason, message: MESSAGES[result.reason] });
      return;
    }
    res.status(201).json(result.group);
  });

  // POST /api/groups/:id/join
  router.post('/:id/join', studentsOnly, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const result = await joinGroup(pool, id, req.user!.id);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.status(409).json({ error: result.reason, message: MESSAGES[result.reason] });
      return;
    }
    res.json(result.group);
  });

  // POST /api/groups/:id/leave
  router.post('/:id/leave', studentsOnly, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const result = await leaveGroup(pool, id, req.user!.id);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const status = result.reason === 'creator_cannot_leave' ? 403 : 409;
      res.status(status).json({ error: result.reason, message: MESSAGES[result.reason] });
      return;
    }
    res.json(result.group);
  });

  // DELETE /api/groups/:id (creator or admin)
  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const result = id ? await deleteGroup(pool, id, req.user!) : ({ ok: false, reason: 'not_found' } as const);
    if (!result.ok) {
      res.status(result.reason === 'not_found' ? 404 : 403).json({ error: result.reason });
      return;
    }
    res.status(204).end();
  });

  return router;
}
