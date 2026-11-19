/*
  Everything the app reads and writes goes through here.
  - Listings come from the Express API (/api/listings). The seed listings in listings.ts are shown
    after them, because reviews, landlords and roommate posts still point at the seed ids.
  - Roommate posts come from /api/groups, with the seed posts in roommates.ts shown after them.
  - Reviews and landlords have no endpoints yet, so they stay in the browser.
    When they get endpoints, replace those function bodies with request() calls that return the
    same shape; nothing else needs to change.
*/
import { z } from 'zod';
import {
  ListingSchema,
  ReviewSchema,
  RoommatePostSchema,
  SCORE_KEYS,
  type Landlord,
  type Listing,
  type ListingRecord,
  type Review,
  type RoommatePost,
  type ScoreKey,
} from './data';
import { ApiError, request } from './http';
import { landlords } from './landlords';
import { listingRecords } from './listings';
import { reviews as seedReviews } from './reviews';
import { roommatePosts as seedPosts } from './roommates';
import { readJSON, writeJSON } from '@/lib/store';

export { ApiError } from './http';

export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} "${id}" was not found`);
    this.name = 'NotFoundError';
  }
}

/** Listings from the API have UUID ids; seed listings have slugs like "broughdale-five". */
export const isServerId = (id: string) => z.uuid().safeParse(id).success;

// What the user created in this browser, kept between visits.
const KEYS = { reviews: 'knock:my-reviews' };

function loadCreated<T>(key: string, schema: { safeParse: (v: unknown) => { success: boolean } }) {
  const items = readJSON<unknown[]>(key, [], Array.isArray);
  return items.filter((item) => schema.safeParse(item).success) as T[];
}

const db = {
  reviews: [...loadCreated<Review>(KEYS.reviews, ReviewSchema), ...seedReviews],
  landlords,
};

// A little latency in the browser so loading states get exercised; none in tests.
const LATENCY = typeof window === 'undefined' ? 0 : 180;
const wait = <T>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY));

/** The server returns at most 50 listings per request. */
const PAGE_SIZE = 50;

async function fetchAllListings(): Promise<ListingRecord[]> {
  const all: ListingRecord[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await request<unknown>(`/listings?limit=${PAGE_SIZE}&offset=${offset}`);
    const records = ListingSchema.array().parse(page);
    all.push(...records);
    if (records.length < PAGE_SIZE) return all;
  }
}

/** Fields the server sets itself; its strict schema rejects a POST that includes them. */
type ServerOwned = 'id' | 'postedAt' | 'postedBy' | 'westernVerified' | 'landlordId';
export type NewListing = Omit<ListingRecord, ServerOwned>;

export type RatingSummary = {
  average: number;
  count: number;
  scores: Record<ScoreKey, number>;
  /** How many reviews gave 5, 4, 3, 2 and 1 stars, in that order. */
  distribution: [number, number, number, number, number];
};

export function ratingFor(reviews: Review[]): RatingSummary {
  const count = reviews.length;
  const mean = (pick: (r: Review) => number) =>
    count ? reviews.reduce((sum, r) => sum + pick(r), 0) / count : 0;
  const scores = Object.fromEntries(
    SCORE_KEYS.map((key) => [key, mean((r) => r.scores[key])]),
  ) as Record<ScoreKey, number>;
  const distribution = [5, 4, 3, 2, 1].map(
    (stars) => reviews.filter((r) => r.rating === stars).length,
  ) as RatingSummary['distribution'];
  return { average: mean((r) => r.rating), count, scores, distribution };
}

function withRating(record: ListingRecord): Listing {
  const { average, count } = ratingFor(db.reviews.filter((r) => r.listingId === record.id));
  return { ...record, rating: average, reviewCount: count };
}

export type LandlordSummary = Landlord & {
  rating: RatingSummary;
  listingIds: string[];
};

function landlordSummary(landlord: Landlord): LandlordSummary {
  // Landlords only exist in the seed data so far, so only seed listings can belong to one.
  const listingIds = listingRecords.filter((l) => l.landlordId === landlord.id).map((l) => l.id);
  const rating = ratingFor(db.reviews.filter((r) => listingIds.includes(r.listingId)));
  return { ...landlord, rating, listingIds };
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

/** The signed-in user, as GET /api/auth/me returns it. */
export type Role = 'student' | 'landlord' | 'admin';
export type AuthUser = { id: string; email: string; name: string; role: Role };

export const api = {
  /** Null when nobody is signed in or the session has ended. */
  async getMe(): Promise<AuthUser | null> {
    try {
      return await request<AuthUser>('/auth/me', { auth: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },

  async getListings(): Promise<Listing[]> {
    const fromServer = await fetchAllListings();
    return [...fromServer, ...listingRecords].map(withRating);
  },

  async getListing(id: string): Promise<Listing> {
    if (!isServerId(id)) {
      const record = listingRecords.find((l) => l.id === id);
      if (!record) throw new NotFoundError('Listing', id);
      return wait(withRating(record));
    }
    try {
      return withRating(ListingSchema.parse(await request<unknown>(`/listings/${id}`)));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw new NotFoundError('Listing', id);
      throw error;
    }
  },

  getReviews: () =>
    wait([...db.reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),

  getLandlords: () => wait(db.landlords.map(landlordSummary)),

  getLandlord(id: string) {
    const landlord = db.landlords.find((l) => l.id === id);
    return landlord
      ? wait(landlordSummary(landlord))
      : Promise.reject(new NotFoundError('Landlord', id));
  },

  /** Posts from the API (newest first), then the seed posts. */
  async getRoommatePosts(): Promise<RoommatePost[]> {
    const fromServer = RoommatePostSchema.array().parse(await request<unknown>('/groups'));
    const seeds = [...seedPosts].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    return [...fromServer, ...seeds];
  },

  /** Needs a signed-in user: students post sublets, landlords post leases. */
  async createListing(input: NewListing & Partial<Pick<ListingRecord, ServerOwned>>): Promise<Listing> {
    const { id: _id, postedAt: _at, postedBy: _by, westernVerified: _wv, landlordId: _ll, ...body } = input;
    const created = await request<unknown>('/listings', { method: 'POST', body, auth: true });
    return withRating(ListingSchema.parse(created));
  },

  createReview(input: Omit<Review, 'id' | 'createdAt'>) {
    const review = ReviewSchema.parse({ ...input, id: newId('r'), createdAt: new Date().toISOString() });
    db.reviews.unshift(review);
    writeJSON(KEYS.reviews, db.reviews.filter((r) => r.id.startsWith('r-')));
    return wait(review);
  },

  /** Students only. The poster becomes the group's first member. */
  async createRoommatePost(input: Omit<RoommatePost, 'id' | 'postedAt'>): Promise<RoommatePost> {
    const body = {
      kind: input.kind,
      title: input.title,
      body: input.body,
      author: input.author,
      haveCount: input.members.length,
      spotsTotal: input.spotsTotal,
      budget: input.budget,
      moveIn: input.moveIn,
      months: input.months,
      neighbourhoods: input.neighbourhoods,
      tags: input.tags,
      ...(input.listingId && isServerId(input.listingId) ? { listingId: input.listingId } : {}),
    };
    return RoommatePostSchema.parse(await request<unknown>('/groups', { method: 'POST', body, auth: true }));
  },

  /** Take an open spot in a group. Students only; returns the updated post. */
  async joinGroup(id: string): Promise<RoommatePost> {
    return RoommatePostSchema.parse(await request<unknown>(`/groups/${id}/join`, { method: 'POST', auth: true }));
  },

  /** Give up your spot. The person who started the group can't leave it. */
  async leaveGroup(id: string): Promise<RoommatePost> {
    return RoommatePostSchema.parse(await request<unknown>(`/groups/${id}/leave`, { method: 'POST', auth: true }));
  },
};
