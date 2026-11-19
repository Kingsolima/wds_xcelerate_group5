
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

const url = process.env.TEST_DATABASE_URL;

describe('groups API (database)', { skip: !url && 'TEST_DATABASE_URL not set' }, () => {
  let pool: pg.Pool;
  let server: Server;
  let base: string;
  let listingId: string;
  let groupId: string;

  const users: Record<'student' | 'student2' | 'landlord', { id: string; role: Role }> = {
    student: { id: randomUUID(), role: 'student' },
    student2: { id: randomUUID(), role: 'student' },
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

      await pool.query(
        `DELETE FROM neon_auth."user" WHERE id = ANY($1::uuid[])`,
        [Object.values(users).map((u) => u.id)],
      );

      await pool.end();
    }
  });

  test('student creates a group and becomes its first member', async () => {
    const res = await call('POST', '/groups', 'student', {
      listingId,
      capacity: 4,
    });

    assert.equal(res.status, 201);

    const group = await res.json();
    groupId = group.id;

    assert.equal(group.listingId, listingId);
    assert.equal(group.capacity, 4);
    assert.equal(group.createdBy, users.student.id);

    const detailsRes = await call('GET', `/groups/${group.id}`, 'student');
    assert.equal(detailsRes.status, 200);

    const details = await detailsRes.json();

    assert.equal(details.members.length, 1);
    assert.equal(details.members[0].userId, users.student.id);
    assert.equal(details.spotsAvailable, 3);
  });

  test('another student can join the group', async () => {
    const res = await call('POST', `/groups/${groupId}/join`, 'student2');

    assert.equal(res.status, 200);

    const detailsRes = await call('GET', `/groups/${groupId}`, 'student');
    assert.equal(detailsRes.status, 200);

    const details = await detailsRes.json();

    assert.equal(details.members.length, 2);
    assert.ok(
      details.members.some(
        (member: { userId: string }) => member.userId === users.student2.id,
      ),
    );
    assert.equal(details.spotsAvailable, 2);
  });
    test('student cannot join the same group twice', async () => {
    const res = await call('POST', `/groups/${groupId}/join`, 'student2');

    assert.equal(res.status, 409);

    const detailsRes = await call('GET', `/groups/${groupId}`, 'student');
    const details = await detailsRes.json();

    assert.equal(details.members.length, 2);
    assert.equal(details.spotsAvailable, 2);
  });
    test('student can leave a group', async () => {
    const res = await call('POST', `/groups/${groupId}/leave`, 'student2');

    assert.equal(res.status, 200);

    const detailsRes = await call('GET', `/groups/${groupId}`, 'student');
    assert.equal(detailsRes.status, 200);

    const details = await detailsRes.json();

    assert.equal(details.members.length, 1);
    assert.equal(details.members[0].userId, users.student.id);
    assert.equal(details.spotsAvailable, 3);
  });
    test('group creator cannot leave', async () => {
    const res = await call('POST', `/groups/${groupId}/leave`, 'student');

    assert.equal(res.status, 403);

    const detailsRes = await call('GET', `/groups/${groupId}`, 'student');
    assert.equal(detailsRes.status, 200);

    const details = await detailsRes.json();

    assert.equal(details.members.length, 1);
    assert.equal(details.members[0].userId, users.student.id);
    assert.equal(details.spotsAvailable, 3);
  });
    test('students cannot join a full group', async () => {
    const createRes = await call('POST', '/groups', 'student', {
      listingId,
      capacity: 1,
    });

    assert.equal(createRes.status, 201);

    const fullGroup = await createRes.json();

    const joinRes = await call(
      'POST',
      `/groups/${fullGroup.id}/join`,
      'student2',
    );

    assert.equal(joinRes.status, 409);

    const detailsRes = await call(
      'GET',
      `/groups/${fullGroup.id}`,
      'student',
    );

    assert.equal(detailsRes.status, 200);

    const details = await detailsRes.json();

    assert.equal(details.members.length, 1);
    assert.equal(details.spotsAvailable, 0);
  });
});
