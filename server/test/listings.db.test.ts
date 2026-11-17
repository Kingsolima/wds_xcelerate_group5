// Listings API against a real Postgres database.
// Skipped unless TEST_DATABASE_URL is set. Use a THROWAWAY Neon branch with migrations applied:
//   neon checkout test        (then DATABASE_URL=<test branch url> npm run migrate -w server)
//   TEST_DATABASE_URL=<test branch url> npm test -w server
// It creates two test users in neon_auth."user" and deletes them (and their listings) afterwards.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express, { type RequestHandler } from 'express';
import pg from 'pg';
import { listingsRouter, meRouter } from '../src/routes/listings.ts';
import { errorHandler } from '../src/errors.ts';
import type { Role } from '../src/auth/types.ts';
import { sampleListing } from './fixtures.ts';

const url = process.env.TEST_DATABASE_URL;

describe('listings API (database)', { skip: !url && 'TEST_DATABASE_URL not set' }, () => {
  let pool: pg.Pool;
  let server: Server;
  let base: string;
  const users: Record<'student' | 'student2' | 'landlord', { id: string; role: Role }> = {
    student: { id: randomUUID(), role: 'student' },
    student2: { id: randomUUID(), role: 'student' },
    landlord: { id: randomUUID(), role: 'landlord' },
  };

  // Fake auth: `x-test-user` header picks one of the users above.
  const fakeAuth: RequestHandler = (req, res, next) => {
    const user = users[req.get('x-test-user') as keyof typeof users];
    if (!user) {
      res.status(401).json({ error: 'not_signed_in' });
      return;
    }
    req.user = { id: user.id, email: `${user.id}@test.local`, name: 'Test', role: user.role };
    next();
  };

  const call = (method: string, path: string, as?: keyof typeof users, body?: unknown) =>
    fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(as ? { 'x-test-user': as } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  before(async () => {
    pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
    for (const u of Object.values(users)) {
      await pool.query(
        `INSERT INTO neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, 'Test', $2, true, now(), now())`,
        [u.id, `${u.id}@test.local`],
      );
      await pool.query('INSERT INTO profiles (user_id, role) VALUES ($1, $2)', [u.id, u.role]);
    }

    const app = express();
    app.use(express.json());
    app.use('/api/listings', listingsRouter({ pool, auth: fakeAuth }));
    app.use('/api/me', meRouter({ pool, auth: fakeAuth }));
    app.use(errorHandler);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  after(async () => {
    server?.close();
    if (pool) {
      // Deleting the auth users cascades to profiles and listings.
      await pool.query(`DELETE FROM neon_auth."user" WHERE id = ANY($1::uuid[])`, [
        Object.values(users).map((u) => u.id),
      ]);
      await pool.end();
    }
  });

  let subletId: string;

  test('student posts a sublet', async () => {
    const res = await call('POST', '/listings', 'student', sampleListing());
    assert.equal(res.status, 201);
    const listing = await res.json();
    assert.equal(listing.kind, 'sublet');
    assert.equal(listing.postedBy, users.student.id);
    assert.equal(listing.landlordId, null);
    assert.equal(listing.westernVerified, false);
    assert.equal(listing.availableTo, '2027-08-31');
    assert.deepEqual(listing.housingDetails, { beds: 4, baths: 1.5, roomsOpen: 1 });
    subletId = listing.id;
  });

  test('landlord posts a lease', async () => {
    const res = await call('POST', '/listings', 'landlord', sampleListing({ kind: 'lease', availableTo: undefined }));
    assert.equal(res.status, 201);
    const listing = await res.json();
    assert.equal(listing.landlordId, users.landlord.id);
    assert.equal(listing.availableTo, undefined);
  });

  test('GET /listings/:id returns the listing; unknown id is 404', async () => {
    assert.equal((await call('GET', `/listings/${subletId}`)).status, 200);
    assert.equal((await call('GET', `/listings/${randomUUID()}`)).status, 404);
  });

  test('date-range filter only returns sublets free for the whole period', async () => {
    const inside = await (await call('GET', '/listings?kind=sublet&from=2027-05-15&to=2027-08-01')).json();
    assert.ok(inside.some((l: { id: string }) => l.id === subletId));

    const tooLate = await (await call('GET', '/listings?kind=sublet&from=2027-05-15&to=2027-09-15')).json();
    assert.ok(!tooLate.some((l: { id: string }) => l.id === subletId));
  });

  test('ended sublets are hidden from search but shown in /me/listings', async () => {
    const { rows } = await pool.query(
      `INSERT INTO listings (kind, type, name, description, price, lease, address, neighbourhood,
         beds, baths, rooms_open, walk_minutes, bus_minutes, grocery_minutes,
         available_from, available_to, photos, posted_by)
       VALUES ('sublet', 'room', 'old', 'old', 500, 4, 'a', 'Downtown', 1, 1, 1, 1, 1, 1,
         '2020-01-01', '2020-04-30', '{}', $1) RETURNING id`,
      [users.student2.id],
    );
    const oldId = rows[0].id;

    const search = await (await call('GET', '/listings?kind=sublet&limit=50')).json();
    assert.ok(!search.some((l: { id: string }) => l.id === oldId));

    const mine = await (await call('GET', '/me/listings', 'student2')).json();
    assert.ok(mine.some((l: { id: string }) => l.id === oldId));
  });

  test('a student can have at most 3 active sublets', async () => {
    // student already has 1 active sublet
    assert.equal((await call('POST', '/listings', 'student', sampleListing())).status, 201);
    assert.equal((await call('POST', '/listings', 'student', sampleListing())).status, 201);
    const res = await call('POST', '/listings', 'student', sampleListing());
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, 'sublet_limit');
  });

  test('owner can update; dates are re-checked after merging', async () => {
    const res = await call('PATCH', `/listings/${subletId}`, 'student', { price: 600 });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).price, 600);

    // Moving the start date past the existing end date is rejected.
    const bad = await call('PATCH', `/listings/${subletId}`, 'student', { availableFrom: '2027-09-01' });
    assert.equal(bad.status, 400);
  });

  test("someone else can't update or delete", async () => {
    assert.equal((await call('PATCH', `/listings/${subletId}`, 'student2', { price: 1 })).status, 403);
    assert.equal((await call('DELETE', `/listings/${subletId}`, 'student2')).status, 403);
  });

  test('owner can delete', async () => {
    assert.equal((await call('DELETE', `/listings/${subletId}`, 'student')).status, 204);
    assert.equal((await call('GET', `/listings/${subletId}`)).status, 404);
    assert.equal((await call('DELETE', `/listings/${subletId}`, 'student')).status, 404);
  });
});
