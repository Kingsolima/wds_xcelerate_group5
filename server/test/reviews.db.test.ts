// Reviews API against a real Postgres database.
// Skipped unless TEST_DATABASE_URL is set. Use a THROWAWAY Neon branch with migrations applied
// (see listings.db.test.ts for the commands).
// It creates test users in neon_auth."user" and deletes them (and their listings and reviews) afterwards.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express, { type RequestHandler } from 'express';
import pg from 'pg';
import { listingsRouter } from '../src/routes/listings.ts';
import { listingReviewsRouter, reviewsRouter } from '../src/routes/reviews.ts';
import { errorHandler } from '../src/errors.ts';
import type { Role } from '../src/auth/types.ts';
import { sampleListing } from './fixtures.ts';
import { sampleReview } from './fixtures.reviews.ts';

const url = process.env.TEST_DATABASE_URL;

describe('reviews API (database)', { skip: !url && 'TEST_DATABASE_URL not set' }, () => {
  let pool: pg.Pool;
  let server: Server;
  let base: string;
  const users: Record<
    'student' | 'student2' | 'poster' | 'landlord',
    { id: string; role: Role; name: string }
  > = {
    student: { id: randomUUID(), role: 'student', name: 'Reviewer One' },
    student2: { id: randomUUID(), role: 'student', name: 'Reviewer Two' },
    poster: { id: randomUUID(), role: 'student', name: 'Sublet Poster' },
    landlord: { id: randomUUID(), role: 'landlord', name: 'Landlord' },
  };

  // Fake auth: `x-test-user` header picks one of the users above.
  const fakeAuth: RequestHandler = (req, res, next) => {
    const user = users[req.get('x-test-user') as keyof typeof users];
    if (!user) {
      res.status(401).json({ error: 'not_signed_in' });
      return;
    }
    req.user = { id: user.id, email: `${user.id}@test.local`, name: user.name, role: user.role };
    next();
  };

  const call = (method: string, path: string, as?: keyof typeof users, body?: unknown) =>
    fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(as ? { 'x-test-user': as } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let leaseId: string;
  let subletId: string;

  before(async () => {
    pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
    for (const u of Object.values(users)) {
      await pool.query(
        `INSERT INTO neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, true, now(), now())`,
        [u.id, u.name, `${u.id}@test.local`],
      );
      await pool.query('INSERT INTO profiles (user_id, role) VALUES ($1, $2)', [u.id, u.role]);
    }

    const app = express();
    app.use(express.json());
    app.use('/api/listings/:id/reviews', listingReviewsRouter({ pool, auth: fakeAuth }));
    app.use('/api/listings', listingsRouter({ pool, auth: fakeAuth }));
    app.use('/api/reviews', reviewsRouter({ pool, auth: fakeAuth }));
    app.use(errorHandler);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

    const lease = await call(
      'POST',
      '/listings',
      'landlord',
      sampleListing({ kind: 'lease', availableTo: undefined }),
    );
    leaseId = (await lease.json()).id;
    const sublet = await call('POST', '/listings', 'poster', sampleListing());
    subletId = (await sublet.json()).id;
  });

  after(async () => {
    server?.close();
    if (pool) {
      // Deleting the auth users cascades to profiles, listings and reviews.
      await pool.query(`DELETE FROM neon_auth."user" WHERE id = ANY($1::uuid[])`, [
        Object.values(users).map((u) => u.id),
      ]);
      await pool.end();
    }
  });

  test('a new listing has no reviews and a zero rating', async () => {
    const listing = await (await call('GET', `/listings/${leaseId}`)).json();
    assert.equal(listing.rating, 0);
    assert.equal(listing.reviewCount, 0);

    const res = await call('GET', `/listings/${leaseId}/reviews`);
    assert.equal(res.status, 200);
    const { summary, reviews } = await res.json();
    assert.equal(summary.count, 0);
    assert.deepEqual(reviews, []);
  });

  let reviewId: string;

  test('student posts a review', async () => {
    const res = await call(
      'POST',
      `/listings/${leaseId}/reviews`,
      'student',
      sampleReview({ rating: 5 }),
    );
    assert.equal(res.status, 201);
    const review = await res.json();
    assert.equal(review.listingId, leaseId);
    assert.equal(review.authorId, users.student.id);
    assert.deepEqual(review.author, { name: 'Reviewer One', detail: '3rd-year Kinesiology' });
    assert.equal(review.rating, 5);
    reviewId = review.id;
  });

  test('a second review of the same listing is 409', async () => {
    const res = await call('POST', `/listings/${leaseId}/reviews`, 'student', sampleReview());
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, 'already_reviewed');
  });

  test('landlords cannot review; students cannot review their own sublet', async () => {
    assert.equal(
      (await call('POST', `/listings/${leaseId}/reviews`, 'landlord', sampleReview())).status,
      403,
    );
    assert.equal(
      (await call('POST', `/listings/${subletId}/reviews`, 'poster', sampleReview())).status,
      403,
    );
  });

  test('reviewing a listing that does not exist is 404', async () => {
    assert.equal(
      (await call('POST', `/listings/${randomUUID()}/reviews`, 'student', sampleReview())).status,
      404,
    );
    assert.equal((await call('GET', `/listings/${randomUUID()}/reviews`)).status, 404);
  });

  test('GET returns the summary and newest reviews first; listing shows its rating', async () => {
    assert.equal(
      (await call('POST', `/listings/${leaseId}/reviews`, 'student2', sampleReview({ rating: 2 })))
        .status,
      201,
    );

    const { summary, reviews } = await (await call('GET', `/listings/${leaseId}/reviews`)).json();
    assert.equal(summary.count, 2);
    assert.equal(summary.average, 3.5);
    assert.deepEqual(summary.distribution, [1, 0, 0, 1, 0]);
    assert.equal(reviews[0].authorId, users.student2.id);
    assert.equal(reviews[1].authorId, users.student.id);

    const listing = await (await call('GET', `/listings/${leaseId}`)).json();
    assert.equal(listing.rating, 3.5);
    assert.equal(listing.reviewCount, 2);

    const search = await (await call('GET', '/listings?kind=lease&limit=50')).json();
    const found = search.find((l: { id: string }) => l.id === leaseId);
    assert.equal(found.reviewCount, 2);
  });

  test("someone else can't delete a review; the author can", async () => {
    assert.equal((await call('DELETE', `/reviews/${reviewId}`, 'student2')).status, 403);
    assert.equal((await call('DELETE', `/reviews/${reviewId}`, 'student')).status, 204);
    assert.equal((await call('DELETE', `/reviews/${reviewId}`, 'student')).status, 404);
  });

  test('deleting a listing deletes its reviews', async () => {
    assert.equal((await call('DELETE', `/listings/${leaseId}`, 'landlord')).status, 204);
    const { rows } = await pool.query(
      'SELECT count(*)::int AS n FROM reviews WHERE listing_id = $1',
      [leaseId],
    );
    assert.equal(rows[0].n, 0);
  });
});
