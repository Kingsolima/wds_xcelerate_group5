import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { ratingFor } from '@/data/api';
import { landlordsQueryOptions, listingsQueryOptions, reviewsQueryOptions } from '@/data/queries';
import { sized } from '@/data/photos';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Rating, Stars } from '@/components/Rating';
import { ReviewCard } from '@/components/ReviewCard';
import { Segmented } from '@/components/Segmented';

type View = 'places' | 'landlords' | 'latest';

export const Route = createFileRoute('/reviews/')({
  validateSearch: (search: Record<string, unknown>): { view?: View } => ({
    view: ['places', 'landlords', 'latest'].includes(search.view as string) ? (search.view as View) : undefined,
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(reviewsQueryOptions()),
      queryClient.ensureQueryData(listingsQueryOptions()),
      queryClient.ensureQueryData(landlordsQueryOptions()),
    ]),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { view = 'places' } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: reviews } = useSuspenseQuery(reviewsQueryOptions());
  const { data: listings } = useSuspenseQuery(listingsQueryOptions());
  const { data: landlords } = useSuspenseQuery(landlordsQueryOptions());
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const places = useMemo(
    () =>
      listings
        .filter((l) => l.reviewCount > 0)
        .filter((l) => !q || [l.name, l.address, l.neighbourhood].some((t) => t.toLowerCase().includes(q)))
        .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating),
    [listings, q],
  );
  const owners = useMemo(
    () =>
      landlords
        .filter((l) => !q || l.name.toLowerCase().includes(q))
        .sort((a, b) => b.rating.count - a.rating.count),
    [landlords, q],
  );
  const latest = reviews.filter(
    (r) => !q || [r.title, r.body, listings.find((l) => l.id === r.listingId)?.name ?? ''].some((t) => t.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader tone="butter" title="Reviews" quiet="From students who lived there">
        {plural(reviews.length, 'review')} of {plural(places.length, 'place')} and {plural(landlords.length, 'landlord')}. Scores
        cover the landlord, the condition, the value for money and how quiet it is.
      </PageHeader>

      <div className="wrap pt-8 pb-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Segmented
            label="Show"
            value={view}
            onChange={(v) => navigate({ search: { view: v === 'places' ? undefined : v }, replace: true, resetScroll: false })}
            options={[
              { value: 'places', label: 'Places' },
              { value: 'landlords', label: 'Landlords' },
              { value: 'latest', label: 'Latest reviews' },
            ]}
            className="self-start"
          />
          <div className="relative md:w-80">
            <Search size={17} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={view === 'landlords' ? 'Search landlords' : 'Search places and reviews'}
              placeholder={view === 'landlords' ? 'Landlord name' : 'Street, area or word'}
              className="min-h-11 w-full rounded-xl bg-white pr-4 pl-10 text-[0.9375rem] inset-ring inset-ring-line placeholder:text-ink-faint hover:inset-ring-ink-faint focus-visible:inset-ring-2 focus-visible:inset-ring-purple focus-visible:outline-none"
            />
          </div>
        </div>

        <div className="mt-8">
          {view === 'places' && (
            <ul className="divide-y divide-line rounded-3xl bg-white shadow-card">
              {places.map((l) => {
                const summary = ratingFor(reviews.filter((r) => r.listingId === l.id));
                return (
                  <li key={l.id}>
                    <Link
                      to="/listings/$listingId"
                      params={{ listingId: l.id }}
                      hash="reviews-heading"
                      className="group flex items-center gap-4 p-4 transition-colors duration-150 hover:bg-paper md:gap-6 md:p-5"
                    >
                      <img
                        src={sized(l.photos.hero.primary, 160, 120)}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/3] w-20 shrink-0 rounded-xl bg-wash object-cover md:w-28"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 leading-snug">{l.name}</span>
                        <span className="mt-1 block font-text text-[0.8125rem] text-ink-soft">{l.neighbourhood}</span>
                      </span>
                      <span className="hidden w-40 shrink-0 md:block">
                        <ScoreBar label="Landlord" value={summary.scores.landlord} />
                        <ScoreBar label="Condition" value={summary.scores.condition} />
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-display text-2xl tabular-nums tracking-normal">{l.rating.toFixed(1)}</span>
                        <span className="font-text text-xs text-ink-faint">{plural(l.reviewCount, 'review')}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {places.length === 0 && <Empty query={query} />}
            </ul>
          )}

          {view === 'landlords' && (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {owners.map((l) => (
                <li key={l.id}>
                  <Link
                    to="/landlords/$landlordId"
                    params={{ landlordId: l.id }}
                    className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <span className="text-xl leading-tight">{l.name}</span>
                    <span className="mt-1 font-text text-[0.8125rem] text-ink-soft">
                      {l.kind === 'company' ? 'Property company' : 'Private landlord'} · {plural(l.listingIds.length, 'listing')}
                    </span>
                    <span className="mt-auto flex items-end justify-between pt-6">
                      <Stars value={l.rating.average} size={16} />
                      <Rating average={l.rating.average} count={l.rating.count} />
                    </span>
                  </Link>
                </li>
              ))}
              {owners.length === 0 && <Empty query={query} />}
            </ul>
          )}

          {view === 'latest' && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {latest.map((r) => (
                <ReviewCard key={r.id} review={r} listingName={listings.find((l) => l.id === r.listingId)?.name} />
              ))}
              {latest.length === 0 && <Empty query={query} />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-2 py-0.5 font-text text-xs">
      <span className="w-16 text-ink-soft">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-wash">
        <span
          className={cn('block h-full origin-left rounded-full', value < 2.5 ? 'bg-danger' : 'bg-ink')}
          style={{ transform: `scaleX(${value / 5})` }}
        />
      </span>
      <span className="w-6 text-right tabular-nums">{value.toFixed(1)}</span>
    </span>
  );
}

function Empty({ query }: { query: string }) {
  return (
    <li className="list-none p-8 font-text text-ink-soft md:col-span-2 xl:col-span-3">
      Nothing matches “{query}”. Try a street name or a neighbourhood.
    </li>
  );
}
