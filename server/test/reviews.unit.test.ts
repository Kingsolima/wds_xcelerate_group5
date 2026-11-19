// Reviews tests that need no database.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express, { type RequestHandler } from 'express';
import type { Pool } from 'pg';
import { ReviewInput } from '../src/reviews/schema.ts';
import { summarize, toReview, type ReviewRow } from '../src/reviews/repo.ts';
import { canDeleteReview, listingReviewsRouter, reviewsRouter } from '../src/routes/reviews.ts';
import { errorHandler } from '../src/errors.ts';
import type { AuthUser } from '../src/auth/types.ts';
import { sampleReview } from './fixtures.reviews.ts';

describe('ReviewInput', () => {
  test('accepts a valid review', () => {
    assert.equal(ReviewInput.safeParse(sampleReview()).success, true);
  });

  test('ratings and scores must be whole numbers from 1 to 5', () => {
    assert.equal(ReviewInput.safeParse(sampleReview({ rating: 0 })).success, false);
    assert.equal(ReviewInput.safeParse(sampleReview({ rating: 6 })).success, false);
    assert.equal(ReviewInput.safeParse(sampleReview({ rating: 3.5 })).success, false);
    assert.equal(
      ReviewInput.safeParse(
        sampleReview({ scores: { landlord: 9, condition: 4, value: 3, quiet: 4 } }),
      ).success,
      false,
    );
  });

  test('missing score is rejected', () => {
    assert.equal(
      ReviewInput.safeParse(sampleReview({ scores: { landlord: 5, condition: 4, value: 3 } }))
        .success,
      false,
    );
  });

  test('blank title or body is rejected', () => {
    assert.equal(ReviewInput.safeParse(sampleReview({ title: '   ' })).success, false);
    assert.equal(ReviewInput.safeParse(sampleReview({ body: '' })).success, false);
  });

  test('server-owned fields are rejected', () => {
    assert.equal(ReviewInput.safeParse(sampleReview({ listingId: 'x' })).success, false);
    assert.equal(
      ReviewInput.safeParse(sampleReview({ author: { name: 'Someone' } })).success,
      false,
    );
    assert.equal(ReviewInput.safeParse(sampleReview({ createdAt: '2020-01-01' })).success, false);
  });
});

describe('summarize', () => {
  const r = (rating: number, s: number) => ({
    rating,
    scores: { landlord: s, condition: s, value: s, quiet: s },
  });

  test('no reviews gives zeros', () => {
    assert.deepEqual(summarize([]), {
      average: 0,
      count: 0,
      scores: { landlord: 0, condition: 0, value: 0, quiet: 0 },
      distribution: [0, 0, 0, 0, 0],
    });
  });

  test('averages and the 5-to-1 star distribution', () => {
    const s = summarize([r(5, 4), r(4, 2), r(4, 3)]);
    assert.equal(s.count, 3);
    assert.equal(s.average, 13 / 3);
    assert.equal(s.scores.landlord, 3);
    assert.deepEqual(s.distribution, [1, 2, 0, 0, 0]);
  });
});

describe('row mapping', () => {
  test('toReview turns a row into the API shape', () => {
    const row: ReviewRow = {
      id: 'r1',
      listing_id: 'l1',
      author_id: 'u1',
      author_name: 'Sam',
      author_detail: '2nd-year Engineering',
      lived_there: '2025–26',
      rating: 4,
      score_landlord: 5,
      score_condition: 4,
      score_value: 3,
      score_quiet: 2,
      title: 't',
      body: 'b',
      created_at: new Date('2026-11-17T12:00:00Z'),
    };
    assert.deepEqual(toReview(row), {
      id: 'r1',
      listingId: 'l1',
      authorId: 'u1',
      author: { name: 'Sam', detail: '2nd-year Engineering' },
      livedThere: '2025–26',
      rating: 4,
      scores: { landlord: 5, condition: 4, value: 3, quiet: 2 },
      title: 't',
      body: 'b',
      createdAt: '2026-11-17T12:00:00.000Z',
    });
  });
});

describe('canDeleteReview', () => {
  const author: AuthUser = { id: 'u1', email: 'a@uwo.ca', name: 'A', role: 'student' };
  const other: AuthUser = { id: 'u2', email: 'b@uwo.ca', name: 'B', role: 'student' };
  const admin: AuthUser = { id: 'u3', email: 'c@x.com', name: 'C', role: 'admin' };

  test('author and admins can delete, others cannot', () => {
    assert.equal(canDeleteReview(author, { authorId: 'u1' }), true);
    assert.equal(canDeleteReview(admin, { authorId: 'u1' }), true);
    assert.equal(canDeleteReview(other, { authorId: 'u1' }), false);
  });
});

describe('review routes that reject before touching the database', () => {
  let server: Server;
  let base: string;

  // Any database call fails the test.
  const noDb = {
    query: () => assert.fail('database should not be called'),
    connect: () => assert.fail('database should not be called'),
  } as unknown as Pool;

  // Fake auth: `x-test-role` header signs you in with that role.
  const fakeAuth: RequestHandler = (req, res, next) => {
    const role = req.get('x-test-role');
    if (!role) {
      res.status(401).json({ error: 'not_signed_in' });
      return;
    }
    req.user = { id: 'u1', email: 'a@uwo.ca', name: 'A', role: role as AuthUser['role'] };
    next();
  };

  before(() => {
    const app = express();
    app.use(express.json());
    app.use('/api/listings/:id/reviews', listingReviewsRouter({ pool: noDb, auth: fakeAuth }));
    app.use('/api/reviews', reviewsRouter({ pool: noDb, auth: fakeAuth }));
    app.use(errorHandler);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  after(() => {
    server.close();
  });

  const post = (listingId: string, body: unknown, role?: string) =>
    fetch(`${base}/listings/${listingId}/reviews`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(role ? { 'x-test-role': role } : {}) },
      body: JSON.stringify(body),
    });

  test('POST without signing in is 401', async () => {
    assert.equal((await post(randomUUID(), sampleReview())).status, 401);
  });

  test('landlords and admins cannot post reviews', async () => {
    assert.equal((await post(randomUUID(), sampleReview(), 'landlord')).status, 403);
    assert.equal((await post(randomUUID(), sampleReview(), 'admin')).status, 403);
  });

  test('POST to a non-UUID listing is 404', async () => {
    assert.equal((await post('not-a-uuid', sampleReview(), 'student')).status, 404);
  });

  test('POST with an invalid body is 400', async () => {
    const res = await post(randomUUID(), sampleReview({ rating: 9 }), 'student');
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_input');
  });

  test('GET reviews for a non-UUID listing is 404', async () => {
    assert.equal((await fetch(`${base}/listings/not-a-uuid/reviews`)).status, 404);
  });

  test('DELETE without signing in is 401, non-UUID id is 404', async () => {
    assert.equal(
      (await fetch(`${base}/reviews/${randomUUID()}`, { method: 'DELETE' })).status,
      401,
    );
    const res = await fetch(`${base}/reviews/not-a-uuid`, {
      method: 'DELETE',
      headers: { 'x-test-role': 'student' },
    });
    assert.equal(res.status, 404);
  });
});
