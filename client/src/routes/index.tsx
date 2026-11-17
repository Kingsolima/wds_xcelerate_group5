import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  listingsQueryOptions,
  reviewsQueryOptions,
  roommatePostsQueryOptions,
} from '@/data/queries';
import { SCORE_KEYS, SCORE_LABELS, spotsOpen } from '@/data/data';
import { formatDateRange } from '@/lib/format';
import { AREA_TIMES } from '@/lib/post-schemas';
import { Landing, type LandingStats } from '@/components/landing/Landing';

export const Route = createFileRoute('/')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(listingsQueryOptions()),
      queryClient.ensureQueryData(reviewsQueryOptions()),
      queryClient.ensureQueryData(roommatePostsQueryOptions()),
    ]),
  component: Home,
});

/** The landing page. Every number on it is counted from the same data the rest of the app reads. */
function Home() {
  const { data: listings } = useSuspenseQuery(listingsQueryOptions());
  const { data: reviews } = useSuspenseQuery(reviewsQueryOptions());
  const { data: posts } = useSuspenseQuery(roommatePostsQueryOptions());

  const sublets = listings.filter((listing) => listing.kind === 'sublet');
  const soonest = [...sublets].sort((a, b) => a.availableFrom.localeCompare(b.availableFrom))[0];
  const open = posts.filter((post) => spotsOpen(post) > 0);

  const stats: LandingStats = {
    listings: listings.length,
    sublets: sublets.length,
    subletFrom: sublets.length ? Math.min(...sublets.map((listing) => listing.price)) : null,
    subletWindow: soonest ? formatDateRange(soonest.availableFrom, soonest.availableTo) : null,
    reviews: reviews.length,
    scores: SCORE_KEYS.map((key) => ({
      label: SCORE_LABELS[key],
      value: reviews.length
        ? reviews.reduce((sum, review) => sum + review.scores[key], 0) / reviews.length
        : 0,
    })),
    groups: open.length,
    spots: open.reduce((sum, post) => sum + spotsOpen(post), 0),
    verified: listings.filter((listing) => listing.westernVerified).length,
    // The model is a suite in Masonville, so its travel times are that area's.
    busMinutes: AREA_TIMES.Masonville.bus,
    groceryMinutes: AREA_TIMES.Masonville.grocery,
  };

  return <Landing stats={stats} />;
}
