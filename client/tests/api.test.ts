import { describe, expect, test } from 'bun:test';
import { NotFoundError, api, ratingFor } from '@/data/api';
import { listingRecords } from '@/data/listings';
import { reviews } from '@/data/reviews';
import { landlords } from '@/data/landlords';
import { roommatePosts } from '@/data/roommates';
import { ListingSchema, ReviewSchema, RoommatePostSchema } from '@/data/data';

describe('mock api', () => {
  test('unknown ids reject with NotFoundError', async () => {
    expect(api.getListing('nope')).rejects.toBeInstanceOf(NotFoundError);
    expect(api.getLandlord('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('every record matches its schema', () => {
    listingRecords.forEach((l) => expect(ListingSchema.safeParse(l).success).toBe(true));
    reviews.forEach((r) => expect(ReviewSchema.safeParse(r).success).toBe(true));
    roommatePosts.forEach((p) => expect(RoommatePostSchema.safeParse(p).success).toBe(true));
  });

  test('ids are unique', () => {
    expect(new Set(listingRecords.map((l) => l.id)).size).toBe(listingRecords.length);
  });

  test('every reference resolves', () => {
    const listingIds = new Set(listingRecords.map((l) => l.id));
    const landlordIds = new Set(landlords.map((l) => l.id));
    listingRecords.forEach((l) => l.landlordId && expect(landlordIds.has(l.landlordId)).toBe(true));
    reviews.forEach((r) => expect(listingIds.has(r.listingId)).toBe(true));
    roommatePosts.forEach((p) => p.listingId && expect(listingIds.has(p.listingId)).toBe(true));
  });

  test('addresses never carry a house number', () => {
    listingRecords.forEach((l) => expect(l.address).not.toMatch(/^\d/));
  });

  test('sublets have an end date', () => {
    listingRecords
      .filter((l) => l.kind === 'sublet')
      .forEach((l) => expect(l.availableTo).toBeDefined());
  });

  test('ratingFor([]) is empty, not NaN', () => {
    const r = ratingFor([]);
    expect(r.count).toBe(0);
    expect(r.average).toBe(0);
    expect(r.distribution).toEqual([0, 0, 0, 0, 0]);
  });

  test('listings carry a rating worked out from their reviews', async () => {
    const listing = await api.getListing('broughdale-five');
    expect(listing.reviewCount).toBe(3);
    expect(listing.rating).toBeCloseTo((5 + 4 + 5) / 3);
  });
});
