// Auth middleware tests. Tokens are signed with a local Ed25519 key, so no Neon or database is needed.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type CryptoKey } from 'jose';
import { createVerifier } from '../src/auth/verify.ts';
import { requireAuth, requireRole, roleForEmail } from '../src/auth/middleware.ts';
import type { Role } from '../src/auth/types.ts';

const ORIGIN = 'https://ep-test.neonauth.us-east-1.aws.neon.tech';

let privateKey: CryptoKey;
let otherKey: CryptoKey;
let server: Server;
let baseUrl: string;

interface Claims {
  sub?: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  banned?: boolean;
}

async function sign(
  claims: Claims = {},
  { key = privateKey, issuer = ORIGIN, audience = ORIGIN, expiresIn = '15m' } = {},
) {
  const payload = {
    email: 'student@uwo.ca',
    emailVerified: true,
    name: 'Test Student',
    ...claims,
  };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'EdDSA', kid: 'test' })
    .setSubject(claims.sub ?? '11111111-1111-1111-1111-111111111111')
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

function get(path: string, token?: string) {
  return fetch(baseUrl + path, { headers: token ? { authorization: `Bearer ${token}` } : {} });
}

before(async () => {
  const pair = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair('EdDSA', { crv: 'Ed25519' })).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'test', alg: 'EdDSA' };

  const verify = createVerifier({ keys: createLocalJWKSet({ keys: [jwk] }), origin: ORIGIN });
  const getRole = async (_id: string, email: string): Promise<Role> => roleForEmail(email);
  const auth = requireAuth(verify, getRole);

  const app = express();
  app.get('/me', auth, (req, res) => res.json(req.user));
  app.get('/landlord-only', auth, requireRole('landlord'), (_req, res) => res.json({ ok: true }));

  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

describe('requireAuth', () => {
  test('valid token returns the user with their role', async () => {
    const res = await get('/me', await sign());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'student@uwo.ca',
      name: 'Test Student',
      role: 'student',
    });
  });

  test('missing token is 401', async () => {
    assert.equal((await get('/me')).status, 401);
  });

  test('garbage token is 401', async () => {
    assert.equal((await get('/me', 'not-a-jwt')).status, 401);
  });

  test('expired token is 401', async () => {
    const token = await sign({}, { expiresIn: '-1m' });
    assert.equal((await get('/me', token)).status, 401);
  });

  test('wrong issuer is 401', async () => {
    const token = await sign({}, { issuer: 'https://evil.example.com' });
    assert.equal((await get('/me', token)).status, 401);
  });

  test('wrong audience is 401', async () => {
    const token = await sign({}, { audience: 'https://evil.example.com' });
    assert.equal((await get('/me', token)).status, 401);
  });

  test('token signed by another key is 401', async () => {
    const token = await sign({}, { key: otherKey });
    assert.equal((await get('/me', token)).status, 401);
  });

  test('unverified email is 403', async () => {
    const res = await get('/me', await sign({ emailVerified: false }));
    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { error: 'email_not_verified' });
  });

  test('banned user is 403', async () => {
    assert.equal((await get('/me', await sign({ banned: true }))).status, 403);
  });
});

describe('requireRole', () => {
  test('student is blocked from landlord-only route', async () => {
    assert.equal((await get('/landlord-only', await sign())).status, 403);
  });

  test('landlord is allowed', async () => {
    const token = await sign({ email: 'owner@gmail.com' });
    assert.equal((await get('/landlord-only', token)).status, 200);
  });
});

describe('roleForEmail', () => {
  test('uwo.ca emails are students, case-insensitive', () => {
    assert.equal(roleForEmail('a@uwo.ca'), 'student');
    assert.equal(roleForEmail('A@UWO.CA'), 'student');
  });

  test('look-alike domains are not students', () => {
    assert.equal(roleForEmail('a@uwo.ca.evil.com'), 'landlord');
    assert.equal(roleForEmail('a@notuwo.ca'), 'landlord');
    assert.equal(roleForEmail('a@gmail.com'), 'landlord');
  });
});
