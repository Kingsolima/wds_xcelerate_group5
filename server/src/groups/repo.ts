
import type { Pool } from 'pg';
import type { GroupInput } from './schema.ts';

// Represents a roommate group stored in the database.
export interface Group {
  id: string;
  listingId: string;
  createdBy: string;
  capacity: number;
  createdAt: string;
}

// Represents a student belonging to a group.
export interface GroupMember {
  groupId: string;
  userId: string;
  joinedAt: string;
}

export async function createGroup(
  pool: Pool,
  input: GroupInput,
  userId: string,
): Promise<Group> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check that the listing exists and determine its size.
    const listing = await client.query<{ beds: number }>(
      'SELECT beds FROM listings WHERE id = $1',
      [input.listingId],
    );

    if (listing.rows.length === 0) {
      throw new Error('listing_not_found');
    }

    if (input.capacity > listing.rows[0]!.beds) {
      throw new Error('capacity_exceeds_beds');
    }

    // Create the group.
    const result = await client.query<{
      id: string;
      listing_id: string;
      created_by: string;
      capacity: number;
      created_at: Date;
    }>(
      `INSERT INTO groups (listing_id, created_by, capacity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.listingId, userId, input.capacity],
    );

    const group = result.rows[0]!;

    // The creator automatically becomes the first member.
    await client.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)`,
      [group.id, userId],
    );

    await client.query('COMMIT');

    return {
      id: group.id,
      listingId: group.listing_id,
      createdBy: group.created_by,
      capacity: group.capacity,
      createdAt: group.created_at.toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface GroupDetails extends Group {
  members: GroupMember[];
  spotsAvailable: number;
}

export async function getGroup(
  pool: Pool,
  groupId: string,
): Promise<GroupDetails | null> {
  const result = await pool.query<{
    id: string;
    listing_id: string;
    created_by: string;
    capacity: number;
    created_at: Date;
  }>(
    'SELECT * FROM groups WHERE id = $1',
    [groupId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0]!;

  const membersResult = await pool.query<{
    group_id: string;
    user_id: string;
    joined_at: Date;
  }>(
    `SELECT group_id, user_id, joined_at
     FROM group_members
     WHERE group_id = $1
     ORDER BY joined_at ASC, user_id ASC`,
    [groupId],
  );

  const members = membersResult.rows.map((member) => ({
    groupId: member.group_id,
    userId: member.user_id,
    joinedAt: member.joined_at.toISOString(),
  }));

  return {
    id: row.id,
    listingId: row.listing_id,
    createdBy: row.created_by,
    capacity: row.capacity,
    createdAt: row.created_at.toISOString(),
    members,
    spotsAvailable: Math.max(0, row.capacity - members.length),
  };
}

export type JoinResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'already_member' | 'group_full' };

export async function joinGroup(
  pool: Pool,
  groupId: string,
  userId: string,
): Promise<JoinResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the group so only one join operation
    // can modify its membership at a time.
    const groupResult = await client.query<{ capacity: number }>(
      'SELECT capacity FROM groups WHERE id = $1 FOR UPDATE',
      [groupId],
    );

    if (groupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'not_found' };
    }

    // Check if this student is already in the group.
    const existingMember = await client.query(
      `SELECT 1 FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId],
    );

    if (existingMember.rows.length > 0) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'already_member' };
    }

    // Count how many students are currently in the group.
    const countResult = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM group_members
       WHERE group_id = $1`,
      [groupId],
    );

    const memberCount = countResult.rows[0]!.count;
    const capacity = groupResult.rows[0]!.capacity;

    if (memberCount >= capacity) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'group_full' };
    }

    // Add the student to the group.
    await client.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)`,
      [groupId, userId],
    );

    await client.query('COMMIT');
    return { ok: true };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export type LeaveResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_member' | 'creator_cannot_leave' };

export async function leaveGroup(
  pool: Pool,
  groupId: string,
  userId: string,
): Promise<LeaveResult> {
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

    // The creator cannot leave because they manage the group.
    if (groupResult.rows[0]!.created_by === userId) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'creator_cannot_leave' };
    }

    // Remove the student from the group.
    const result = await client.query(
      `DELETE FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId],
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'not_member' };
    }

    await client.query('COMMIT');

    return { ok: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
