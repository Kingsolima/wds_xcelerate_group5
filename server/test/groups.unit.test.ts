
import { before, after } from 'node:test';
import express, { type RequestHandler } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Pool } from 'pg';
import type { AuthUser } from '../src/auth/types.ts';
import { groupsRouter } from '../src/routes/groups.ts';
import { errorHandler } from '../src/errors.ts';

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { GroupId, GroupInput } from '../src/groups/schema.ts';

const validListingId = '550e8400-e29b-41d4-a716-446655440000';

describe('GroupInput', () => {
  test('accepts a valid group', () => {
    const result = GroupInput.safeParse({
      listingId: validListingId,
      capacity: 4,
    });

    assert.equal(result.success, true);
  });

  test('rejects a group with zero capacity', () => {
    const result = GroupInput.safeParse({
      listingId: validListingId,
      capacity: 0,
    });

    assert.equal(result.success, false);
  });

  test('rejects a negative capacity', () => {
    const result = GroupInput.safeParse({
      listingId: validListingId,
      capacity: -2,
    });

    assert.equal(result.success, false);
  });

  test('rejects capacity greater than 20', () => {
    const result = GroupInput.safeParse({
      listingId: validListingId,
      capacity: 21,
    });

    assert.equal(result.success, false);
  });

  test('rejects non-integer capacity', () => {
    const result = GroupInput.safeParse({
      listingId: validListingId,
      capacity: 3.5,
    });

    assert.equal(result.success, false);
  });

  test('rejects an invalid listing ID', () => {
    const result = GroupInput.safeParse({
      listingId: 'not-a-uuid',
      capacity: 4,
    });

    assert.equal(result.success, false);
  });

  test('rejects unexpected fields', () => {
    const result = GroupInput.safeParse({
      listingId: validListingId,
      capacity: 4,
      createdBy: 'someone-else',
    });

    assert.equal(result.success, false);
  });
});

describe('GroupId', () => {
  test('accepts a valid UUID', () => {
    assert.equal(GroupId.safeParse(validListingId).success, true);
  });

  test('rejects an invalid UUID', () => {
    assert.equal(GroupId.safeParse('invalid-id').success, false);
  });
});

describe('Group API authentication and validation', () => {
  let server: Server;
  let baseUrl: string;

  // If a test reaches the database, it should fail.
  const noDb = {
    query: () => assert.fail('Database should not be called'),
    connect: () => assert.fail('Database should not be called'),
  } as unknown as Pool;

  // Simulate authentication without needing Neon.
  const fakeAuth: RequestHandler = (req, res, next) => {
    const role = req.get('x-test-role');

    if (!role) {
      res.status(401).json({ error: 'not_signed_in' });
      return;
    }

    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'student@uwo.ca',
      name: 'Test Student',
      role: role as AuthUser['role'],
    };

    next();
  };

  before(() => {
    const app = express();
    app.use(express.json());
    app.use('/api/groups', groupsRouter({ pool: noDb, auth: fakeAuth }));
    app.use(errorHandler);

    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/groups`;
  });

  after(() => {
    server.close();
  });

  test('unauthenticated users cannot create groups', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ listingId: validListingId, capacity: 4 }),
    });

    assert.equal(res.status, 401);
  });

  test('landlords cannot create roommate groups', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-role': 'landlord',
      },
      body: JSON.stringify({ listingId: validListingId, capacity: 4 }),
    });

    assert.equal(res.status, 403);
  });

  test('students cannot create groups with invalid capacity', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-role': 'student',
      },
      body: JSON.stringify({ listingId: validListingId, capacity: -3 }),
    });

    assert.equal(res.status, 400);
  });

  test('invalid group ID returns 404', async () => {
    const res = await fetch(`${baseUrl}/invalid-id`, {
      headers: { 'x-test-role': 'student' },
    });

    assert.equal(res.status, 404);
  });

  test('landlords cannot join groups', async () => {
    const res = await fetch(`${baseUrl}/${validListingId}/join`, {
      method: 'POST',
      headers: { 'x-test-role': 'landlord' },
    });

    assert.equal(res.status, 403);
  });

  test('unauthenticated users cannot leave groups', async () => {
    const res = await fetch(`${baseUrl}/${validListingId}/leave`, {
      method: 'POST',
    });

    assert.equal(res.status, 401);
  });
});
