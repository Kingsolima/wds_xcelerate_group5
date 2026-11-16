/*
  The only file that knows the data is local. When the Express API exists, replace each function
  body with a fetch('/api/...') call that returns the same shape; nothing else needs to change.
*/
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
import { landlords } from './landlords';
import { listingRecords } from './listings';
import { reviews as seedReviews } from './reviews';
import { roommatePosts as seedPosts } from './roommates';
import { readJSON, writeJSON } from '@/lib/store';

export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} "${id}" was not found`);
    this.name = 'NotFoundError';
  }
}

// What the user created in this browser, kept between visits.
const KEYS = { listings: 'knock:my-listings', reviews: 'knock:my-reviews', posts: 'knock:my-posts' };

function loadCreated<T>(key: string, schema: { safeParse: (v: unknown) => { success: boolean } }) {
  const items = readJSON<unknown[]>(key, [], Array.isArray);
  return items.filter((item) => schema.safeParse(item).success) as T[];
}

const db = {
  listings: [...loadCreated<ListingRecord>(KEYS.listings, ListingSchema), ...listingRecords],
  reviews: [...loadCreated<Review>(KEYS.reviews, ReviewSchema), ...seedReviews],
  posts: [...loadCreated<RoommatePost>(KEYS.posts, RoommatePostSchema), ...seedPosts],
  landlords,
};

// A little latency in the browser so loading states get exercised; none in tests.
const LATENCY = typeof window === 'undefined' ? 0 : 180;
const wait = <T>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY));

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
  const listingIds = db.listings.filter((l) => l.landlordId === landlord.id).map((l) => l.id);
  const rating = ratingFor(db.reviews.filter((r) => listingIds.includes(r.listingId)));
  return { ...landlord, rating, listingIds };
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

export const api = {
  getListings: () => wait(db.listings.map(withRating)),

  getListing(id: string) {
    const record = db.listings.find((l) => l.id === id);
    return record ? wait(withRating(record)) : Promise.reject(new NotFoundError('Listing', id));
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

  getRoommatePosts: () =>
    wait([...db.posts].sort((a, b) => b.postedAt.localeCompare(a.postedAt))),

  createListing(input: Omit<ListingRecord, 'id' | 'postedAt'>) {
    const record = ListingSchema.parse({ ...input, id: newId('l'), postedAt: new Date().toISOString() });
    db.listings.unshift(record);
    writeJSON(KEYS.listings, db.listings.filter((l) => l.id.startsWith('l-')));
    return wait(withRating(record));
  },

  createReview(input: Omit<Review, 'id' | 'createdAt'>) {
    const review = ReviewSchema.parse({ ...input, id: newId('r'), createdAt: new Date().toISOString() });
    db.reviews.unshift(review);
    writeJSON(KEYS.reviews, db.reviews.filter((r) => r.id.startsWith('r-')));
    return wait(review);
  },

  createRoommatePost(input: Omit<RoommatePost, 'id' | 'postedAt'>) {
    const post = RoommatePostSchema.parse({ ...input, id: newId('p'), postedAt: new Date().toISOString() });
    db.posts.unshift(post);
    writeJSON(KEYS.posts, db.posts.filter((p) => p.id.startsWith('p-')));
    return wait(post);
  },
};
