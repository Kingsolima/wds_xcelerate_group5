// Request validation for reviews.
// Field shapes are copied from ReviewSchema in client/src/data/data.ts. Keep them in sync.
import { z } from 'zod';

export const SCORE_KEYS = ['landlord', 'condition', 'value', 'quiet'] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

const score = z.number().int().min(1).max(5);

/** POST body. Server-owned fields (id, listingId, author name, createdAt) are not accepted. */
export const ReviewInput = z
  .object({
    authorDetail: z.string().trim().min(1).max(120),
    livedThere: z.string().trim().min(1).max(40),
    rating: score,
    scores: z.object({ landlord: score, condition: score, value: score, quiet: score }).strict(),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(5000),
  })
  .strict();
export type ReviewInput = z.infer<typeof ReviewInput>;

export const ReviewId = z.uuid();
