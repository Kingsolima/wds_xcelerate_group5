// Reviews API. Reviews belong to a listing; landlord reviews come later.
import { Router, type RequestHandler } from 'express';
import type { Pool } from 'pg';
import type { AuthUser } from '../auth/types.ts';
import { ListingId } from '../listings/schema.ts';
import { getListing } from '../listings/repo.ts';
import { ReviewId, ReviewInput } from '../reviews/schema.ts';
import {
  createReview,
  deleteReview,
  getReview,
  listForListing,
  summarize,
  type Review,
} from '../reviews/repo.ts';

interface Deps {
  pool: Pool;
  /** requireAuth middleware (sets req.user). */
  auth: RequestHandler;
}

/** Only the author of a review, or an admin, can delete it. */
export function canDeleteReview(user: AuthUser, review: Pick<Review, 'authorId'>): boolean {
  return user.role === 'admin' || review.authorId === user.id;
}

/** Mounted at /api/listings/:id/reviews. */
export function listingReviewsRouter({ pool, auth }: Deps): Router {
  const router = Router({ mergeParams: true });

  router.get('/', async (req, res) => {
    const parsed = ListingId.safeParse((req.params as { id?: string }).id);
    const listing = parsed.success && (await getListing(pool, parsed.data));
    if (!listing) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const reviews = await listForListing(pool, listing.id);
    res.json({ summary: summarize(reviews), reviews });
  });

  router.post('/', auth, async (req, res) => {
    const user = req.user!;
    if (user.role !== 'student') {
      res.status(403).json({ error: 'forbidden', message: 'Only students can post reviews' });
      return;
    }
    const parsed = ListingId.safeParse((req.params as { id?: string }).id);
    if (!parsed.success) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const input = ReviewInput.parse(req.body);

    const listing = await getListing(pool, parsed.data);
    if (!listing) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (listing.postedBy === user.id) {
      res.status(403).json({ error: 'forbidden', message: "You can't review your own listing" });
      return;
    }

    const result = await createReview(pool, listing.id, input, user);
    if (!result.ok) {
      res
        .status(409)
        .json({ error: 'already_reviewed', message: 'You have already reviewed this listing' });
      return;
    }
    res.status(201).json(result.review);
  });

  return router;
}

/** Mounted at /api/reviews. */
export function reviewsRouter({ pool, auth }: Deps): Router {
  const router = Router();

  router.delete('/:id', auth, async (req, res) => {
    const parsed = ReviewId.safeParse(req.params.id);
    const review = parsed.success && (await getReview(pool, parsed.data));
    if (!review) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (!canDeleteReview(req.user!, review)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    await deleteReview(pool, review.id);
    res.status(204).end();
  });

  return router;
}
