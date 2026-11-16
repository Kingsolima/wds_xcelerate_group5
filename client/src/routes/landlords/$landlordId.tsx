import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Building2, ChevronLeft, User } from 'lucide-react';
import { NotFoundError } from '@/data/api';
import { landlordQueryOptions, listingsQueryOptions, reviewsQueryOptions } from '@/data/queries';
import { plural } from '@/lib/format';
import { ListingCard } from '@/components/ListingCard';
import { NotFound } from '@/components/NotFound';
import { RatingBreakdown } from '@/components/RatingBreakdown';
import { ReviewCard } from '@/components/ReviewCard';

export const Route = createFileRoute('/landlords/$landlordId')({
  loader: async ({ context: { queryClient }, params: { landlordId } }) => {
    try {
      await queryClient.ensureQueryData(landlordQueryOptions(landlordId));
    } catch (error) {
      if (error instanceof NotFoundError) throw notFound();
      throw error;
    }
    await Promise.all([
      queryClient.ensureQueryData(listingsQueryOptions()),
      queryClient.ensureQueryData(reviewsQueryOptions()),
    ]);
  },
  notFoundComponent: () => <NotFound title="Landlord not found" body="The link may be wrong, or they no longer list here." />,
  component: LandlordPage,
});

function LandlordPage() {
  const { landlordId } = Route.useParams();
  const { data: landlord } = useSuspenseQuery(landlordQueryOptions(landlordId));
  const { data: listings } = useSuspenseQuery(listingsQueryOptions());
  const { data: reviews } = useSuspenseQuery(reviewsQueryOptions());

  const theirs = listings.filter((l) => l.landlordId === landlord.id);
  const theirReviews = reviews.filter((r) => theirs.some((l) => l.id === r.listingId));
  const Icon = landlord.kind === 'company' ? Building2 : User;

  return (
    <>
      <div className="bg-sky text-sky-ink">
        <div className="wrap pt-6 pb-10 md:pb-14">
          <Link
            to="/reviews"
            search={{ view: 'landlords' }}
            className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm hover:bg-white/40"
          >
            <ChevronLeft size={16} aria-hidden="true" /> All landlords
          </Link>
          <div className="mt-6 flex items-start gap-5">
            <span className="hidden size-16 shrink-0 place-items-center rounded-2xl bg-white text-sky-ink sm:grid">
              <Icon size={28} aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-[2.5rem] leading-none tracking-[-0.02em] uppercase md:text-6xl">{landlord.name}</h1>
              <p className="mt-3 font-text">
                {landlord.kind === 'company' ? 'Property company' : 'Private landlord'} · renting to students since{' '}
                {landlord.since} · {plural(theirs.length, 'listing')}
              </p>
              <p className="mt-3 max-w-xl font-text leading-relaxed">{landlord.about}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap pb-24">
        <section aria-labelledby="landlord-reviews" className="py-12">
          <h2 id="landlord-reviews" className="mb-8 text-2xl">
            What tenants say
          </h2>
          {landlord.rating.count > 0 ? (
            <>
              <RatingBreakdown summary={landlord.rating} />
              <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {theirReviews.map((r) => (
                  <ReviewCard key={r.id} review={r} listingName={theirs.find((l) => l.id === r.listingId)?.name} />
                ))}
              </div>
            </>
          ) : (
            <p className="font-text text-ink-soft">No reviews yet for this landlord’s places.</p>
          )}
        </section>

        <section aria-labelledby="landlord-listings" className="border-t border-line pt-12">
          <h2 id="landlord-listings" className="mb-8 text-2xl">
            Their places
          </h2>
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {theirs.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
