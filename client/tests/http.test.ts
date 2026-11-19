import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { listingRecords } from '@/data/listings';
import type { ListingRecord } from '@/data/data';

// Stands in for Neon Auth: whatever `token` is set to is what getToken() returns.
let token: string | null = null;
mock.module('@/lib/auth', () => ({
  authConfigured: true,
  authClient: () => ({}),
  getToken: async () => token,
}));

const { api, ApiError, NotFoundError } = await import('@/data/api');

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
const realFetch = globalThis.fetch;

/** Answers each fetch with the next response in the list. */
function serve(...responses: Array<{ status?: number; body?: unknown }>) {
  calls = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const { status = 200, body } = responses.shift() ?? { status: 500 };
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  }) as typeof fetch;
}

const serverListing = (id: string, extra: Partial<ListingRecord> = {}): ListingRecord => ({
  ...listingRecords[0]!,
  id,
  landlordId: null,
  postedBy: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  postedAt: '2026-11-01T12:00:00.000Z',
  ...extra,
});
const UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

beforeAll(() => {
  token = null;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  token = null;
});

describe('listings over HTTP', () => {
  test('getListings shows server listings first, then the seeds', async () => {
    serve({ body: [serverListing(UUID)] });
    const listings = await api.getListings();
    expect(calls[0]!.url).toBe('/api/listings?limit=50&offset=0');
    expect(listings[0]!.id).toBe(UUID);
    expect(listings).toHaveLength(1 + listingRecords.length);
  });

  test('getListings keeps paging while pages are full', async () => {
    const full = Array.from({ length: 50 }, (_, i) =>
      serverListing(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`),
    );
    serve({ body: full }, { body: [serverListing(UUID)] });
    const listings = await api.getListings();
    expect(calls.map((c) => c.url)).toEqual([
      '/api/listings?limit=50&offset=0',
      '/api/listings?limit=50&offset=50',
    ]);
    expect(listings).toHaveLength(51 + listingRecords.length);
  });

  test('a UUID is fetched from the server; a 404 becomes NotFoundError', async () => {
    serve({ status: 404, body: { error: 'not_found' } });
    expect(api.getListing(UUID)).rejects.toBeInstanceOf(NotFoundError);
    expect(calls[0]?.url).toBe(`/api/listings/${UUID}`);
  });

  test('seed ids never hit the server', async () => {
    serve();
    await api.getListing('broughdale-five');
    expect(calls).toHaveLength(0);
  });
});

describe('posting a listing', () => {
  const { id: _id, postedAt: _at, ...input } = serverListing(UUID, { kind: 'lease' });

  test('needs a signed-in user', async () => {
    serve();
    const error = await api.createListing(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  test('sends the token and leaves out the fields the server owns', async () => {
    token = 'jwt-123';
    serve({ status: 201, body: serverListing(UUID) });
    const created = await api.createListing(input);
    const { url, init } = calls[0]!;
    expect(url).toBe('/api/listings');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
    const body = JSON.parse(String(init.body));
    for (const key of ['id', 'postedAt', 'postedBy', 'westernVerified', 'landlordId']) {
      expect(body).not.toHaveProperty(key);
    }
    expect(created.id).toBe(UUID);
    expect(created.reviewCount).toBe(0);
  });

  test('shows the server’s own message, e.g. the sublet limit', async () => {
    token = 'jwt-123';
    serve({
      status: 409,
      body: { error: 'sublet_limit', message: 'You can have at most 3 active sublets' },
    });
    const error = await api.createListing(input).catch((e: unknown) => e);
    expect((error as Error).message).toBe('You can have at most 3 active sublets');
  });
});

describe('getMe', () => {
  test('is null when nobody is signed in', async () => {
    serve();
    expect(await api.getMe()).toBeNull();
  });

  test('returns the user from /api/auth/me', async () => {
    token = 'jwt-123';
    const me = { id: UUID, email: 'a@uwo.ca', name: 'A', role: 'student' };
    serve({ body: me });
    expect(await api.getMe()).toEqual(me as never);
    expect(calls[0]!.url).toBe('/api/auth/me');
  });
});
