import { describe, expect, test } from 'bun:test';
import { activeFilterCount, filterListings, listingSearchSchema, sortListings } from '@/lib/filters';
import { listingRecords } from '@/data/listings';
import type { Listing } from '@/data/data';

const listings: Listing[] = listingRecords.map((l) => ({ ...l, rating: 4, reviewCount: 1 }));
const parse = (input: Record<string, unknown>) => listingSearchSchema.parse(input);

describe('listing search params', () => {
  test('garbage params are dropped, not thrown', () => {
    const search = parse({ max: 'abc', beds: 99, type: 'castle', kind: 'boat', sort: 'weird', verified: 'nah', walk: -4 });
    expect(Object.values(search).filter((v) => v !== undefined)).toEqual([]);
  });

  test('a single value becomes a list, unknown entries are removed', () => {
    expect(parse({ type: 'house' }).type).toEqual(['house']);
    expect(parse({ type: ['house', 'castle', 'house'] }).type).toEqual(['house']);
  });

  test('numbers in strings are accepted', () => {
    expect(parse({ max: '800' }).max).toBe(800);
  });
});

describe('filterListings', () => {
  test('max rent is inclusive', () => {
    const result = filterListings(listings, parse({ max: 725 }));
    expect(result.some((l) => l.price === 725)).toBe(true);
    expect(result.every((l) => l.price <= 725)).toBe(true);
  });

  test('beds means that many or more', () => {
    const result = filterListings(listings, parse({ beds: 5 }));
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((l) => l.housingDetails.beds >= 5)).toBe(true);
  });

  test('text search matches name, street and neighbourhood, any case', () => {
    expect(filterListings(listings, parse({ q: 'BROUGHDALE' })).length).toBeGreaterThan(1);
    expect(filterListings(listings, parse({ q: 'richmond st' }))[0]?.id).toBe('richmond-loft');
  });

  test('amenities must all be present', () => {
    const result = filterListings(listings, parse({ amenities: ['gym', 'wifi'] }));
    expect(result.every((l) => l.amenities.includes('gym') && l.amenities.includes('wifi'))).toBe(true);
  });

  test('filters combine with AND', () => {
    const result = filterListings(listings, parse({ kind: 'sublet', furnished: true, max: 600 }));
    expect(result.every((l) => l.kind === 'sublet' && l.furnished && l.price <= 600)).toBe(true);
  });

  test('nothing matching gives an empty list', () => {
    expect(filterListings(listings, parse({ max: 100 }))).toEqual([]);
  });
});

describe('sorting and counting', () => {
  test('unknown sort falls back to recommended', () => {
    // @ts-expect-error deliberately wrong
    expect(sortListings(listings, 'nope')).toHaveLength(listings.length);
  });

  test('price ascending', () => {
    const prices = sortListings(listings, 'price-asc').map((l) => l.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('active filter count ignores q, kind and sort', () => {
    expect(activeFilterCount(parse({ q: 'x', kind: 'lease', sort: 'newest' }))).toBe(0);
    expect(activeFilterCount(parse({ type: ['house', 'room'], max: 800, verified: true }))).toBe(4);
  });
});
