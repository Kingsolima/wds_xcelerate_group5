// Roommate groups. Each group is one post on the Roommates board, and its members are the
// students who joined it. The response shape matches RoommatePost in client/src/data/data.ts.
import type { Pool, PoolClient } from 'pg';
import type { GroupInput } from './schema.ts';

export interface Group {
  id: string;
  kind: GroupInput['kind'];
  title: string;
  body: string;
  author: { name: string; detail: string };
  /** Display names of everyone in the group: the creator, their offline friends, then students who joined. */
  members: string[];
  /** User ids of the members on the app, in the order they joined. The creator is first. */
  memberIds: string[];
  createdBy: string;
  /** How many people the group is for in total. */
  spotsTotal: number;
  budget: number;
  moveIn: string;
  months: number;
  neighbourhoods: string[];
  tags: string[];
  listingId?: string;
  postedAt: string;
}

interface Row {
  id: string;
  kind: Group['kind'];
  title: string;
  body: string;
  author_name: string;
  author_detail: string;
  created_by: string;
  capacity: number;
  offline_members: number;
  budget: number;
  move_in: string;
  months: number;
  neighbourhoods: string[];
  tags: string[];
  listing_id: string | null;
  created_at: Date;
  members: { id: string; name: string | null }[];
}

const SELECT = `
  SELECT g.id, g.kind, g.title, g.body, g.author_name, g.author_detail, g.created_by,
         g.capacity, g.offline_members, g.budget, g.move_in::text AS move_in, g.months,
         g.neighbourhoods, g.tags, g.listing_id, g.created_at,
         COALESCE(
           json_agg(json_build_object('id', m.user_id, 'name', u.name) ORDER BY m.joined_at, m.user_id)
             FILTER (WHERE m.user_id IS NOT NULL),
           '[]'
         ) AS members
  FROM groups g
  LEFT JOIN group_members m ON m.group_id = g.id
  LEFT JOIN neon_auth."user" u ON u.id = m.user_id`;

function toGroup(row: Row): Group {
  // The creator joined first; show them by the name they posted under.
  const joined = row.members.filter((m) => m.id !== row.created_by);
  const creator = row.members.some((m) => m.id === row.created_by) ? [row.created_by] : [];
  const friends = Array.from({ length: row.offline_members }, (_, i) => `Housemate ${i + 1}`);

  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    author: { name: row.author_name, detail: row.author_detail },
    members: [
      ...(creator.length ? [row.author_name] : []),
      ...friends,
      ...joined.map((m) => m.name?.trim() || 'Student'),
    ],
    memberIds: [...creator, ...joined.map((m) => m.id)],
    createdBy: row.created_by,
    spotsTotal: row.capacity,
    budget: row.budget,
    moveIn: row.move_in,
    months: row.months,
    neighbourhoods: row.neighbourhoods,
    tags: row.tags,
    ...(row.listing_id ? { listingId: row.listing_id } : {}),
    postedAt: row.created_at.toISOString(),
  };
}

/** Every group, newest first. Full groups are included; the board hides them. */
export async function listGroups(pool: Pool): Promise<Group[]> {
  const { rows } = await pool.query<Row>(`${SELECT} GROUP BY g.id ORDER BY g.created_at DESC`);
  return rows.map(toGroup);
}

export async function getGroup(db: Pool | PoolClient, groupId: string): Promise<Group | null> {
  const { rows } = await db.query<Row>(`${SELECT} WHERE g.id = $1 GROUP BY g.id`, [groupId]);
  return rows[0] ? toGroup(rows[0]) : null;
}

export type CreateResult =
  | { ok: true; group: Group }
  | { ok: false; reason: 'listing_not_found' | 'capacity_exceeds_beds' };

export async function createGroup(pool: Pool, input: GroupInput, userId: string): Promise<CreateResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // A group for one listing can't be bigger than the place.
    if (input.listingId) {
      const listing = await client.query<{ beds: number }>('SELECT beds FROM listings WHERE id = $1', [
        input.listingId,
      ]);
      if (listing.rows.length === 0) {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'listing_not_found' };
      }
      if (input.spotsTotal > listing.rows[0]!.beds) {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'capacity_exceeds_beds' };
      }
    }

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO groups (
         listing_id, created_by, capacity, kind, title, body, author_name, author_detail,
         offline_members, budget, move_in, months, neighbourhoods, tags
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        input.listingId ?? null,
        userId,
        input.spotsTotal,
        input.kind,
        input.title,
        input.body,
        input.author.name,
        input.author.detail,
        input.haveCount - 1,
        input.budget,
        input.moveIn,
        input.months,
        [...new Set(input.neighbourhoods)],
        [...new Set(input.tags)],
      ],
    );
    const groupId = rows[0]!.id;

    // The creator automatically becomes the first member.
    await client.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [groupId, userId]);

    const group = (await getGroup(client, groupId))!;
    await client.query('COMMIT');
    return { ok: true, group };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export type JoinResult =
  | { ok: true; group: Group }
  | { ok: false; reason: 'not_found' | 'already_member' | 'group_full' };

export async function joinGroup(pool: Pool, groupId: string, userId: string): Promise<JoinResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the group so two students can't take the last spot at the same time.
    const groupResult = await client.query<{ capacity: number; offline_members: number }>(
      'SELECT capacity, offline_members FROM groups WHERE id = $1 FOR UPDATE',
      [groupId],
    );
    const group = groupResult.rows[0];
    if (!group) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'not_found' };
    }

    const existing = await client.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [
      groupId,
      userId,
    ]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'already_member' };
    }

    const countResult = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM group_members WHERE group_id = $1',
      [groupId],
    );
    if (countResult.rows[0]!.count + group.offline_members >= group.capacity) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'group_full' };
    }

    await client.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [groupId, userId]);
    const updated = (await getGroup(client, groupId))!;
    await client.query('COMMIT');
    return { ok: true, group: updated };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export type LeaveResult =
  | { ok: true; group: Group }
  | { ok: false; reason: 'not_found' | 'not_member' | 'creator_cannot_leave' };

export async function leaveGroup(pool: Pool, groupId: string, userId: string): Promise<LeaveResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the group while membership is being updated.
    const groupResult = await client.query<{ created_by: string }>(
      'SELECT created_by FROM groups WHERE id = $1 FOR UPDATE',
      [groupId],
    );
    if (groupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'not_found' };
    }

    // The creator can't leave because they manage the group; they delete it instead.
    if (groupResult.rows[0]!.created_by === userId) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'creator_cannot_leave' };
    }

    const result = await client.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [
      groupId,
      userId,
    ]);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'not_member' };
    }

    const updated = (await getGroup(client, groupId))!;
    await client.query('COMMIT');
    return { ok: true, group: updated };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export type DeleteResult = { ok: true } | { ok: false; reason: 'not_found' | 'forbidden' };

/** Only the creator (or an admin) can take a group down. Members go with it (ON DELETE CASCADE). */
export async function deleteGroup(
  pool: Pool,
  groupId: string,
  user: { id: string; role: string },
): Promise<DeleteResult> {
  const { rows } = await pool.query<{ created_by: string }>('SELECT created_by FROM groups WHERE id = $1', [groupId]);
  if (!rows[0]) return { ok: false, reason: 'not_found' };
  if (rows[0].created_by !== user.id && user.role !== 'admin') return { ok: false, reason: 'forbidden' };
  await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);
  return { ok: true };
}
