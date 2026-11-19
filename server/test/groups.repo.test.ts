
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express, { type RequestHandler } from 'express';
import pg from 'pg';
import { groupsRouter } from '../src/routes/groups.ts';
import { errorHandler } from '../src/errors.ts';
import type { Role } from '../src/auth/types.ts';
import { sampleGroup } from './fixtures.ts';

const url = process.env.TEST_DATABASE_URL;

describe('groups API (database)', { skip: !url && 'TEST_DATABASE_URL not set' }, () => {
  let pool: pg.Pool;
  let server: Server;
  let base: string;
  let listingId: string;
  let groupId: string;

  const users: Record<'student' | 'student2' | 'student3' | 'landlord', { id: string; role: Role }> = {
    student: { id: randomUUID(), role: 'student' },
    student2: { id: randomUUID(), role: 'student' },
    student3: { id: randomUUID(), role: 'student' },
    landlord: { id: randomUUID(), role: 'landlord' },
  };

  const fakeAuth: RequestHandler = (req, res, next) => {
    const user = users[req.get('x-test-user') as keyof typeof users];

    if (!user) {
      res.status(401).json({ error: 'not_signed_in' });
      return;
    }

    req.user = {
      id: user.id,
      email: `${user.id}@test.local`,
      name: 'Test',
      role: user.role,
    };

    next();
  };

  const call = (method: string, path: string, as?: keyof typeof users, body?: unknown) =>
    fetch(base + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(as ? { 'x-test-user': as } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  before(async () => {
    pool = new pg.Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: true },
    });

    for (const u of Object.values(users)) {
      await pool.query(
        `INSERT INTO neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, 'Test', $2, true, now(), now())`,
        [u.id, `${u.id}@test.local`],
      );

      await pool.query(
        'INSERT INTO profiles (user_id, role) VALUES ($1, $2)',
        [u.id, u.role],
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO listings (
         kind, type, name, description, price, lease,
         address, neighbourhood, beds, baths, rooms_open,
         walk_minutes, bus_minutes, grocery_minutes,
         available_from, available_to, photos, posted_by
       )
       VALUES (
         'sublet', 'room', 'Test Roommate Listing',
         'Temporary listing for group tests',
         800, 4, '123 Test Street', 'Downtown',
         4, 2, 4, 10, 15, 5,
         '2027-05-01', '2027-08-31', '{}', $1
       )
       RETURNING id`,
      [users.student.id],
    );

    listingId = rows[0].id;

    const app = express();
    app.use(express.json());
    app.use('/api/groups', groupsRouter({ pool, auth: fakeAuth }));
    app.use(errorHandler);

    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  after(async () => {
    server?.close();

    if (pool) {
      if (listingId) {
        await pool.query('DELETE FROM groups WHERE listing_id = $1', [listingId]);
      }
      await pool.query('DELETE FROM groups WHERE created_by = ANY($1::uuid[])', [
        Object.values(users).map((u) => u.id),
      ]);

      await pool.query(
        `DELETE FROM neon_auth."user" WHERE id = ANY($1::uuid[])`,
        [Object.values(users).map((u) => u.id)],
      );

      await pool.end();
    }
  });

  const get = async (id: string) => {
    const res = await call('GET', `/groups/${id}`);
    assert.equal(res.status, 200);
    return res.json();
  };

  test('student creates a group and becomes its first member', async () => {
    const res = await call('POST', '/groups', 'student', sampleGroup({ listingId, spotsTotal: 4 }));
    assert.equal(res.status, 201);

    const group = await res.json();
    groupId = group.id;

    assert.equal(group.listingId, listingId);
    assert.equal(group.spotsTotal, 4);
    assert.equal(group.createdBy, users.student.id);
    assert.deepEqual(group.memberIds, [users.student.id]);
    assert.deepEqual(group.members, ['Test Student']);
    assert.equal(group.moveIn, '2027-05-01');
  });

  test('anyone can browse groups without signing in', async () => {
    const list = await call('GET', '/groups');
    assert.equal(list.status, 200);
    const groups = await list.json();
    assert.ok(groups.some((g: { id: string }) => g.id === groupId));

    const one = await get(groupId);
    assert.equal(one.title, sampleGroup().title);
  });

  test('a group bigger than the listing is rejected', async () => {
    const res = await call('POST', '/groups', 'student', sampleGroup({ listingId, spotsTotal: 5 }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'capacity_exceeds_beds');
  });

  test('a group needs no listing', async () => {
    const res = await call('POST', '/groups', 'student', sampleGroup());
    assert.equal(res.status, 201);
    assert.equal((await res.json()).listingId, undefined);
  });

  test('another student can join the group', async () => {
    const res = await call('POST', `/groups/${groupId}/join`, 'student2');
    assert.equal(res.status, 200);

    const details = await get(groupId);
    assert.deepEqual(details.memberIds, [users.student.id, users.student2.id]);
    assert.equal(details.members.length, 2);
  });

  test('student cannot join the same group twice', async () => {
    const res = await call('POST', `/groups/${groupId}/join`, 'student2');
    assert.equal(res.status, 409);
    assert.equal((await get(groupId)).members.length, 2);
  });

  test('landlords cannot join groups', async () => {
    const res = await call('POST', `/groups/${groupId}/join`, 'landlord');
    assert.equal(res.status, 403);
  });

  test('student can leave a group', async () => {
    const res = await call('POST', `/groups/${groupId}/leave`, 'student2');
    assert.equal(res.status, 200);
    assert.deepEqual((await get(groupId)).memberIds, [users.student.id]);
  });

  test('group creator cannot leave', async () => {
    const res = await call('POST', `/groups/${groupId}/leave`, 'student');
    assert.equal(res.status, 403);
    assert.deepEqual((await get(groupId)).memberIds, [users.student.id]);
  });

  test('offline friends take up spots, and a full group turns students away', async () => {
    // Creator plus one offline friend, out of 3: one open spot.
    const createRes = await call('POST', '/groups', 'student', sampleGroup({ haveCount: 2, spotsTotal: 3 }));
    assert.equal(createRes.status, 201);
    const group = await createRes.json();
    assert.deepEqual(group.members, ['Test Student', 'Housemate 1']);

    assert.equal((await call('POST', `/groups/${group.id}/join`, 'student2')).status, 200);

    const full = await call('POST', `/groups/${group.id}/join`, 'student3');
    assert.equal(full.status, 409);
    assert.equal((await full.json()).error, 'group_full');
    assert.equal((await get(group.id)).members.length, 3);
  });

  test('only the creator can delete a group', async () => {
    assert.equal((await call('DELETE', `/groups/${groupId}`, 'student2')).status, 403);
    assert.equal((await call('DELETE', `/groups/${groupId}`, 'student')).status, 204);
    assert.equal((await call('GET', `/groups/${groupId}`)).status, 404);
  });
});
