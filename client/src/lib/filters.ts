import { z } from 'zod';
import {
  AMENITIES,
  LISTING_KINDS,
  LISTING_TYPES,
  NEIGHBOURHOODS,
  type Listing,
} from '@/data/data';

/*
  Listing filters live in the URL (?kind=sublet&max=800&type=house...), so a search can be shared
  and survives a reload. Every field is optional and anything malformed is dropped, never thrown.
*/

export const SORTS = {
  recommended: 'Recommended',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  closest: 'Closest to campus',
  rating: 'Best reviewed',
  newest: 'Newest',
} as const;
export type Sort = keyof typeof SORTS;

/** An array param that also accepts a single value, keeping only the allowed entries. */
function listOf<T extends string>(values: readonly T[]) {
  return z
    .preprocess(
      (input) => (input === undefined ? undefined : Array.isArray(input) ? input : [input]),
      z.array(z.unknown()).optional(),
    )
    .transform((items) => {
      const kept = (items ?? []).filter((item): item is T => values.includes(item as T));
      return kept.length ? [...new Set(kept)] : undefined;
    })
    .optional()
    .catch(undefined);
}

const positive = (max: number) => z.coerce.number().int().min(1).max(max).optional().catch(undefined);
const flag = z
  .preprocess((v) => (v === true || v === 'true' || v === 1 || v === '1' ? true : undefined), z.literal(true).optional())
  .catch(undefined);

export const listingSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(80)
    .transform((v) => v || undefined)
    .optional()
    .catch(undefined),
  kind: z.enum(LISTING_KINDS).optional().catch(undefined),
  type: listOf(LISTING_TYPES),
  area: listOf(NEIGHBOURHOODS),
  amenities: listOf(AMENITIES),
  /** Max rent per room per month. */
  max: positive(10_000),
  /** At least this many bedrooms. */
  beds: positive(6),
  /** At most this many minutes' walk to campus. */
  walk: positive(60),
  verified: flag,
  furnished: flag,
  utilities: flag,
  sort: z.enum(Object.keys(SORTS) as [Sort, ...Sort[]]).optional().catch(undefined),
});

export type ListingSearch = z.infer<typeof listingSearchSchema>;

export function filterListings(listings: Listing[], search: ListingSearch): Listing[] {
  const q = search.q?.toLowerCase();
  return listings.filter((l) => {
    if (q && ![l.name, l.address, l.neighbourhood, l.description].some((t) => t.toLowerCase().includes(q)))
      return false;
    if (search.kind && l.kind !== search.kind) return false;
    if (search.type && !search.type.includes(l.type)) return false;
    if (search.area && !search.area.includes(l.neighbourhood)) return false;
    if (search.amenities && !search.amenities.every((a) => l.amenities.includes(a))) return false;
    if (search.max !== undefined && l.price > search.max) return false;
    if (search.beds !== undefined && l.housingDetails.beds < search.beds) return false;
    if (search.walk !== undefined && l.walkMinutes > search.walk) return false;
    if (search.verified && !l.westernVerified) return false;
    if (search.furnished && !l.furnished) return false;
    if (search.utilities && !l.utilitiesIncluded) return false;
    return true;
  });
}

/** Recommended: verified first, then well reviewed and close. */
function recommendedScore(l: Listing) {
  return (l.westernVerified ? 2 : 0) + l.rating - l.walkMinutes / 15;
}

export function sortListings(listings: Listing[], sort: Sort = 'recommended'): Listing[] {
  const sorted = [...listings];
  const by: Record<Sort, (a: Listing, b: Listing) => number> = {
    recommended: (a, b) => recommendedScore(b) - recommendedScore(a),
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    closest: (a, b) => a.walkMinutes - b.walkMinutes,
    rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    newest: (a, b) => b.postedAt.localeCompare(a.postedAt),
  };
  return sorted.sort(by[sort] ?? by.recommended);
}

/** How many filters are on (search text, kind and sort don't count: they have their own controls). */
export function activeFilterCount(search: ListingSearch) {
  const { q: _q, kind: _kind, sort: _sort, ...rest } = search;
  return Object.values(rest).reduce<number>(
    (count, value) => count + (Array.isArray(value) ? value.length : value === undefined ? 0 : 1),
    0,
  );
}
