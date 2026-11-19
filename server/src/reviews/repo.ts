// SQL for the reviews table. Every function takes the pool so tests can point it at any database.
import type { Pool } from 'pg';
import { SCORE_KEYS, type ReviewInput, type ScoreKey } from './schema.ts';

/** A review as the API returns it; matches Review in client/src/data/data.ts (plus authorId). */
export interface Review {
  id: string;
  listingId: string;
  authorId: string;
  author: { name: string; detail: string };
  livedThere: string;
  rating: number;
  scores: Record<ScoreKey, number>;
  title: string;
  body: string;
  createdAt: string;
}

/** Matches RatingSummary in client/src/data/api.ts. */
export interface RatingSummary {
  average: number;
  count: number;
  scores: Record<ScoreKey, number>;
  /** How many reviews gave 5, 4, 3, 2 and 1 stars, in that order. */
  distribution: [number, number, number, number, number];
}

export interface ReviewRow {
  id: string;
  listing_id: string;
  author_id: string;
  author_name: string;
  author_detail: string;
  lived_there: string;
  rating: number;
  score_landlord: number;
  score_condition: number;
  score_value: number;
  score_quiet: number;
  title: string;
  body: string;
  created_at: Date;
}

const COLUMNS = `
  r.id, r.listing_id, r.author_id, u.name AS author_name, r.author_detail, r.lived_there,
  r.rating, r.score_landlord, r.score_condition, r.score_value, r.score_quiet,
  r.title, r.body, r.created_at`;

const FROM = `FROM reviews r JOIN neon_auth."user" u ON u.id = r.author_id`;

export function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    listingId: row.listing_id,
    authorId: row.author_id,
    author: { name: row.author_name, detail: row.author_detail },
    livedThere: row.lived_there,
    rating: row.rating,
    scores: {
      landlord: row.score_landlord,
      condition: row.score_condition,
      value: row.score_value,
      quiet: row.score_quiet,
    },
    title: row.title,
    body: row.body,
    createdAt: row.created_at.toISOString(),
  };
}

/** Same maths as ratingFor() in client/src/data/api.ts. An empty list gives zeros. */
export function summarize(reviews: Pick<Review, 'rating' | 'scores'>[]): RatingSummary {
  const count = reviews.length;
  const mean = (pick: (r: Pick<Review, 'rating' | 'scores'>) => number) =>
    count ? reviews.reduce((sum, r) => sum + pick(r), 0) / count : 0;
  const scores = Object.fromEntries(
    SCORE_KEYS.map((key) => [key, mean((r) => r.scores[key])]),
  ) as Record<ScoreKey, number>;
  const distribution = [5, 4, 3, 2, 1].map(
    (stars) => reviews.filter((r) => r.rating === stars).length,
  ) as RatingSummary['distribution'];
  return { average: mean((r) => r.rating), count, scores, distribution };
}

/** All reviews for a listing, newest first. */
export async function listForListing(pool: Pool, listingId: string): Promise<Review[]> {
  const { rows } = await pool.query<ReviewRow>(
    `SELECT ${COLUMNS} ${FROM} WHERE r.listing_id = $1 ORDER BY r.created_at DESC, r.id`,
    [listingId],
  );
  return rows.map(toReview);
}

export async function getReview(pool: Pool, id: string): Promise<Review | null> {
  const { rows } = await pool.query<ReviewRow>(`SELECT ${COLUMNS} ${FROM} WHERE r.id = $1`, [id]);
  return rows[0] ? toReview(rows[0]) : null;
}

export type CreateReviewResult =
  { ok: true; review: Review } | { ok: false; reason: 'already_reviewed' };

/** Inserts a review. A second review of the same listing by the same student is refused. */
export async function createReview(
  pool: Pool,
  listingId: string,
  input: ReviewInput,
  author: { id: string; name: string },
): Promise<CreateReviewResult> {
  try {
    const { rows } = await pool.query<Omit<ReviewRow, 'author_name'>>(
      `INSERT INTO reviews (listing_id, author_id, author_detail, lived_there, rating,
         score_landlord, score_condition, score_value, score_quiet, title, body)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, listing_id, author_id, author_detail, lived_there, rating,
         score_landlord, score_condition, score_value, score_quiet, title, body, created_at`,
      [
        listingId,
        author.id,
        input.authorDetail,
        input.livedThere,
        input.rating,
        input.scores.landlord,
        input.scores.condition,
        input.scores.value,
        input.scores.quiet,
        input.title,
        input.body,
      ],
    );
    return { ok: true, review: toReview({ ...rows[0]!, author_name: author.name }) };
  } catch (err) {
    // 23505 = unique violation on the one-review-per-student constraint
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr.code === '23505' && pgErr.constraint === 'reviews_one_per_author') {
      return { ok: false, reason: 'already_reviewed' };
    }
    throw err;
  }
}

export async function deleteReview(pool: Pool, id: string): Promise<void> {
  await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
}
