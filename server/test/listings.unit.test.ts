// Listings tests that need no database.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express, { type RequestHandler } from 'express';
import type { Pool } from 'pg';
import { ListingInput, ListingPatch, ListingQuery } from '../src/listings/schema.ts';
import { buildListQuery, toColumns, toListing, type ListingRow } from '../src/listings/repo.ts';
import { canEdit, listingsRouter } from '../src/routes/listings.ts';
import { errorHandler } from '../src/errors.ts';
import type { AuthUser } from '../src/auth/types.ts';
import { sampleListing } from './fixtures.ts';

describe('ListingInput', () => {
  test('accepts a valid sublet', () => {
    assert.equal(ListingInput.safeParse(sampleListing()).success, true);
  });

  test('sublet without an end date is rejected', () => {
    const r = ListingInput.safeParse(sampleListing({ availableTo: undefined }));
    assert.equal(r.success, false);
    assert.deepEqual(r.error?.issues[0]?.path, ['availableTo']);
  });

  test('sublet ending before it starts is rejected', () => {
    assert.equal(ListingInput.safeParse(sampleListing({ availableTo: '2027-04-01' })).success, false);
  });

  test('lease without an end date is fine', () => {
    assert.equal(ListingInput.safeParse(sampleListing({ kind: 'lease', availableTo: undefined })).success, true);
  });

  test('bad enum value is rejected', () => {
    assert.equal(ListingInput.safeParse(sampleListing({ neighbourhood: 'Toronto' })).success, false);
  });

  test('server-owned fields are rejected', () => {
    assert.equal(ListingInput.safeParse(sampleListing({ westernVerified: true })).success, false);
    assert.equal(ListingInput.safeParse(sampleListing({ postedBy: 'someone' })).success, false);
  });
});

describe('ListingPatch', () => {
  test('accepts a partial update', () => {
    assert.equal(ListingPatch.safeParse({ price: 600 }).success, true);
  });

  test('cannot change kind or verification', () => {
    assert.equal(ListingPatch.safeParse({ kind: 'lease' }).success, false);
    assert.equal(ListingPatch.safeParse({ westernVerified: true }).success, false);
  });

  test('empty patch is rejected', () => {
    assert.equal(ListingPatch.safeParse({}).success, false);
  });
});

describe('ListingQuery', () => {
  test('parses query-string values', () => {
    const q = ListingQuery.parse({ minPrice: '500', furnished: 'true', from: '2027-05-01' });
    assert.equal(q.minPrice, 500);
    assert.equal(q.furnished, true);
    assert.equal(q.limit, 20);
    assert.equal(q.offset, 0);
  });

  test('limit is capped at 50 and from must not be after to', () => {
    assert.equal(ListingQuery.safeParse({ limit: '500' }).success, false);
    assert.equal(ListingQuery.safeParse({ from: '2027-09-01', to: '2027-05-01' }).success, false);
  });
});

describe('buildListQuery', () => {
  test('uses parameters for every filter', () => {
    const { sql, params } = buildListQuery(
      ListingQuery.parse({ kind: 'sublet', maxPrice: '700', from: '2027-05-01', to: '2027-08-01' }),
    );
    assert.deepEqual(params, ['sublet', 700, '2027-05-01', '2027-08-01', 20, 0]);
    assert.match(sql, /kind = \$1/);
    assert.match(sql, /price <= \$2/);
    assert.match(sql, /available_from <= \$3/);
    assert.match(sql, /available_to >= \$4/);
    assert.match(sql, /LIMIT \$5 OFFSET \$6/);
    assert.doesNotMatch(sql, /2027/);
  });

  test('always hides ended sublets', () => {
    assert.match(buildListQuery(ListingQuery.parse({})).sql, /available_to >= current_date/);
  });
});

describe('row mapping', () => {
  test('toListing turns a row into the API shape', () => {
    const row: ListingRow = {
      id: 'id-1',
      kind: 'sublet',
      type: 'room',
      name: 'n',
      description: 'd',
      price: 650,
      lease: 4,
      address: 'a',
      neighbourhood: 'Broughdale',
      beds: 4,
      baths: '1.5',
      rooms_open: 1,
      walk_minutes: 8,
      bus_minutes: 5,
      grocery_minutes: 10,
      available_from: '2027-05-01',
      available_to: '2027-08-31',
      furnished: true,
      utilities_included: false,
      amenities: ['wifi'],
      photos: sampleListing().photos as ListingRow['photos'],
      western_verified: false,
      posted_by: 'user-1',
      landlord_id: null,
      posted_at: new Date('2026-11-17T12:00:00Z'),
    };
    const listing = toListing(row);
    assert.deepEqual(listing.housingDetails, { beds: 4, baths: 1.5, roomsOpen: 1 });
    assert.equal(listing.availableTo, '2027-08-31');
    assert.equal(listing.postedAt, '2026-11-17T12:00:00.000Z');
    assert.equal(toListing({ ...row, available_to: null }).availableTo, undefined);
  });

  test('toColumns only includes fields that were sent', () => {
    assert.deepEqual(toColumns({ price: 600, housingDetails: { beds: 3, baths: 1, roomsOpen: 2 } }), {
      price: 600,
      beds: 3,
      baths: 1,
      rooms_open: 2,
    });
  });
});

describe('canEdit', () => {
  const owner: AuthUser = { id: 'u1', email: 'a@uwo.ca', name: 'A', role: 'student' };
  const other: AuthUser = { id: 'u2', email: 'b@uwo.ca', name: 'B', role: 'student' };
  const admin: AuthUser = { id: 'u3', email: 'c@x.com', name: 'C', role: 'admin' };

  test('poster and admins can edit, others cannot', () => {
    assert.equal(canEdit(owner, { postedBy: 'u1' }), true);
    assert.equal(canEdit(admin, { postedBy: 'u1' }), true);
    assert.equal(canEdit(other, { postedBy: 'u1' }), false);
  });
});

describe('routes that reject before touching the database', () => {
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
    app.use('/api/listings', listingsRouter({ pool: noDb, auth: fakeAuth }));
    app.use(errorHandler);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/listings`;
  });

  after(() => {
    server.close();
  });

  const post = (body: unknown, role?: string) =>
    fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(role ? { 'x-test-role': role } : {}) },
      body: JSON.stringify(body),
    });

  test('POST without signing in is 401', async () => {
    assert.equal((await post(sampleListing())).status, 401);
  });

  test('POST with an invalid body is 400', async () => {
    const res = await post(sampleListing({ price: -5 }), 'student');
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_input');
  });

  test('landlords cannot post sublets', async () => {
    assert.equal((await post(sampleListing(), 'landlord')).status, 403);
  });

  test('students cannot post leases', async () => {
    assert.equal((await post(sampleListing({ kind: 'lease' }), 'student')).status, 403);
  });

  test('GET with a non-UUID id is 404', async () => {
    assert.equal((await fetch(`${base}/not-a-uuid`)).status, 404);
  });

  test('GET with a bad filter is 400', async () => {
    assert.equal((await fetch(`${base}?kind=castle`)).status, 400);
  });
});
