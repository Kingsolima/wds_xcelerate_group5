import { useCallback, useMemo, useRef } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { listingsQueryOptions } from '@/data/queries';
import {
  SORTS,
  activeFilterCount,
  filterListings,
  listingSearchSchema,
  sortListings,
  type ListingSearch,
  type Sort,
} from '@/lib/filters';
import { plural } from '@/lib/format';
import { Button, buttonStyles } from '@/components/Button';
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/Segmented';
import { Select } from '@/components/Field';
import { FilterPanel, type SearchPatch } from '@/components/listings/FilterPanel';
import { ActiveFilters, filterPills } from '@/components/listings/ActiveFilters';

export const Route = createFileRoute('/listings/')({
  validateSearch: (search: Record<string, unknown>): ListingSearch => listingSearchSchema.parse(search),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(listingsQueryOptions()),
  pendingComponent: ListingsPending,
  component: ListingsPage,
});

/** Drops empty values so the URL stays short. */
function clean(search: ListingSearch): ListingSearch {
  return Object.fromEntries(
    Object.entries(search).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)),
  ) as ListingSearch;
}

function ListingsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: listings } = useSuspenseQuery(listingsQueryOptions());
  const sheetRef = useRef<HTMLDialogElement>(null);

  const update = useCallback(
    (patch: SearchPatch) =>
      navigate({ search: (prev) => clean({ ...prev, ...patch }), replace: true, resetScroll: false }),
    [navigate],
  );
  const clearFilters = () => navigate({ search: (prev) => clean({ kind: prev.kind, sort: prev.sort }), replace: true, resetScroll: false });

  const results = useMemo(
    () => sortListings(filterListings(listings, search), search.sort),
    [listings, search],
  );
  const filterCount = activeFilterCount(search);
  const sublets = search.kind === 'sublet';

  return (
    <>
      <PageHeader
        tone={sublets ? 'mint' : 'lavender'}
        title={sublets ? 'Sublets' : search.kind === 'lease' ? 'Leases' : 'Listings'}
        quiet={sublets ? 'Rooms open for a term or a summer' : 'Places near Western'}
        actions={
          <Segmented
            label="Kind of listing"
            value={search.kind ?? 'all'}
            onChange={(kind) => update({ kind: kind === 'all' ? undefined : kind })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'lease', label: 'Leases' },
              { value: 'sublet', label: 'Sublets' },
            ]}
            className="bg-white/70"
          />
        }
      >
        {sublets
          ? 'Students away on co-op, exchange or summer break, renting their room until they’re back.'
          : 'Houses, apartments and rooms, with walk times to campus and reviews from past tenants.'}
      </PageHeader>

      {/* Toolbar: sticks under the nav. */}
      <div className="sticky top-16 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="wrap flex flex-wrap items-center gap-2 py-3">
          <SearchBox value={search.q} onCommit={(q) => update({ q })} />
          <button
            type="button"
            onClick={() => sheetRef.current?.showModal()}
            className={buttonStyles({ color: 'outline', className: 'lg:hidden' })}
          >
            <SlidersHorizontal size={16} aria-hidden="true" /> Filters
            {filterCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-xs text-paper tabular-nums">
                {filterCount}
              </span>
            )}
          </button>
          <label className="ml-auto flex items-center gap-2">
            <span className="hidden font-text text-sm text-ink-soft sm:inline">Sort</span>
            <Select
              value={search.sort ?? 'recommended'}
              onChange={(e) => {
                const sort = e.target.value as Sort;
                update({ sort: sort === 'recommended' ? undefined : sort });
              }}
              className="min-w-48"
              aria-label="Sort listings"
            >
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <div className="wrap grid gap-10 pt-8 pb-24 lg:grid-cols-[17rem_1fr] lg:gap-12">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-36 max-h-[calc(100svh-10rem)] overflow-y-auto pr-2 pb-6 [scrollbar-width:thin]">
            <FilterPanel search={search} onChange={update} />
          </div>
        </aside>

        <section aria-labelledby="results-count">
          <div className="mb-6 flex flex-col gap-3">
            <p id="results-count" aria-live="polite" className="text-[0.9375rem]">
              {results.length === listings.length
                ? `${plural(results.length, 'place')}`
                : `${plural(results.length, 'place')} match`}
            </p>
            <ActiveFilters search={search} onChange={update} onClear={clearFilters} />
          </div>

          {results.length ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} eager={i < 3} />
              ))}
            </div>
          ) : (
            <EmptyResults search={search} onChange={update} onClear={clearFilters} />
          )}
        </section>
      </div>

      {/* Filters on phones and tablets: a sheet from the bottom. */}
      <dialog
        ref={sheetRef}
        aria-labelledby="filter-sheet-title"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="sheet m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-3xl bg-paper p-0 lg:hidden"
      >
        <div className="flex max-h-[88dvh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 id="filter-sheet-title" className="text-lg">
              Filters
            </h2>
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => sheetRef.current?.close()}
              className="grid size-11 place-items-center rounded-full hover:bg-wash"
            >
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pt-5">
            <FilterPanel search={search} onChange={update} />
          </div>
          <div className="flex items-center gap-3 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button color="ghost" onClick={clearFilters} disabled={filterCount === 0}>
              Clear all
            </Button>
            <Button className="ml-auto" onClick={() => sheetRef.current?.close()}>
              Show {plural(results.length, 'place')}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Typing filters as you go (after a short pause), so the list never fights the keyboard. */
function SearchBox({ value, onCommit }: { value?: string; onCommit: (q?: string) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <Search size={17} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" />
      <input
        ref={inputRef}
        // Re-mount when the URL changes from elsewhere (a pill removed, clear all).
        key={value ?? ''}
        type="search"
        defaultValue={value}
        aria-label="Search by street, area or name"
        placeholder="Street, area or name"
        onChange={(e) => {
          clearTimeout(timer.current);
          const q = e.target.value.trim() || undefined;
          timer.current = setTimeout(() => onCommit(q), 300);
        }}
        className="min-h-11 w-full rounded-xl bg-white pr-10 pl-10 text-[0.9375rem] inset-ring inset-ring-line placeholder:text-ink-faint hover:inset-ring-ink-faint focus-visible:inset-ring-2 focus-visible:inset-ring-purple focus-visible:outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onCommit(undefined)}
          className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-soft hover:bg-wash"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function EmptyResults({
  search,
  onChange,
  onClear,
}: {
  search: ListingSearch;
  onChange: (patch: SearchPatch) => void;
  onClear: () => void;
}) {
  const pills = filterPills(search);
  return (
    <div className="flex flex-col items-start rounded-3xl bg-white p-8 shadow-card md:p-12">
      <SearchX size={32} aria-hidden="true" className="text-ink-faint" />
      <h2 className="mt-5 text-2xl">No places match all of that</h2>
      <p className="mt-2 max-w-md font-text text-ink-soft">
        {pills.length
          ? 'Try loosening one of these. Each one removes a single filter.'
          : search.kind === 'sublet'
            ? 'No sublets are posted right now. New ones usually appear in March and October.'
            : 'Nothing is posted right now.'}
      </p>
      {pills.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {pills.map((pill) => (
            <Button key={pill.key} color="outline" size="sm" onClick={() => onChange(pill.remove)}>
              Remove “{pill.label}”
            </Button>
          ))}
        </div>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {pills.length > 0 && <Button onClick={onClear}>Clear all filters</Button>}
        <Link to="/roommates" className={buttonStyles({ color: 'outline' })}>
          See roommate posts instead
        </Link>
      </div>
    </div>
  );
}

function ListingsPending() {
  return (
    <div className="wrap pt-40 pb-24">
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
