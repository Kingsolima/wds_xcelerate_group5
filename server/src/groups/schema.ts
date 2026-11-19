// Request validation for roommate groups (the posts on the Roommates board).
// Field rules are copied from roommateSchema in client/src/lib/post-schemas.ts. Keep them in sync.
import { z } from 'zod';
import { NEIGHBOURHOODS } from '../listings/schema.ts';

export const POST_KINDS = ['have-place', 'need-place', 'group'] as const;

export const VIBES = [
  'quiet',
  'social',
  'early riser',
  'night owl',
  'clean',
  'cooks often',
  'pets ok',
  'no smoking',
  'grad student',
  'women only',
  'lgbtq+ friendly',
  'varsity schedule',
] as const;

// Validates the ID of a group or housing listing.
export const GroupId = z.uuid();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2027-05-01');

// Validates the information needed to create a roommate group.
export const GroupInput = z
  .object({
    kind: z.enum(POST_KINDS),
    title: z.string().trim().min(8).max(120),
    body: z.string().trim().min(30).max(1500),
    author: z.object({
      name: z.string().trim().min(2).max(80),
      detail: z.string().trim().min(2).max(80),
    }).strict(),
    /** People already in, the poster included. */
    haveCount: z.number().int().min(1),
    /** How many people the group is for in total. */
    spotsTotal: z.number().int().min(2).max(10),
    budget: z.number().int().min(100).max(10_000),
    moveIn: isoDate,
    months: z.number().int().min(1).max(24),
    neighbourhoods: z.enum(NEIGHBOURHOODS).array().min(1).max(NEIGHBOURHOODS.length),
    tags: z.enum(VIBES).array().max(VIBES.length),
    /** Set when the group is for one listing. */
    listingId: z.uuid().optional(),
  })
  .strict()
  .refine((v) => v.spotsTotal > v.haveCount, {
    path: ['spotsTotal'],
    message: 'Leave at least one open spot',
  });

// TypeScript type inferred from the validation schema.
export type GroupInput = z.infer<typeof GroupInput>;
