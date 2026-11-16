import { useMemo } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { NEIGHBOURHOODS, VIBES, type Neighbourhood } from '@/data/data';
import { roommatePostsQueryOptions } from '@/data/queries';
import { filterPosts, roommateSearchSchema, type RoommateSearch } from '@/lib/roommateFilters';
import { formatPrice, plural } from '@/lib/format';
import { Button, buttonStyles } from '@/components/Button';
import { ToggleChip } from '@/components/Chip';
import { Select } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { RoommatePostCard } from '@/components/RoommatePostCard';
import { Segmented } from '@/components/Segmented';

export const Route = createFileRoute('/roommates/')({
  validateSearch: (search: Record<string, unknown>): RoommateSearch => roommateSearchSchema.parse(search),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(roommatePostsQueryOptions()),
  component: RoommatesPage,
});

const BUDGETS = [600, 700, 800, 1000];

function RoommatesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: posts } = useSuspenseQuery(roommatePostsQueryOptions());
  const results = useMemo(() => filterPosts(posts, search), [posts, search]);

  const update = (patch: Partial<RoommateSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false });
  const toggleTag = (tag: (typeof VIBES)[number]) => {
    const next = search.tag?.includes(tag) ? search.tag.filter((t) => t !== tag) : [...(search.tag ?? []), tag];
    update({ tag: next.length ? next : undefined });
  };
  const anyFilter = Boolean(search.area || search.max || search.tag);

  return (
    <>
      <PageHeader
        tone="peach"
        title="Roommates"
        quiet="Find people, or a house that needs you"
        actions={
          <Link to="/post" search={{ type: 'roommate' }} className={buttonStyles({ color: 'ink' })}>
            <Plus size={16} aria-hidden="true" /> Post a roommate ad
          </Link>
        }
      >
        Students with a place and spare rooms, students who need one, and groups forming to sign together. Knock to say
        you’re interested; if they knock back, you can talk.
      </PageHeader>

      <div className="wrap pt-8 pb-24">
        <div className="flex flex-col gap-5">
          <Segmented
            label="Kind of post"
            value={search.kind ?? 'all'}
            onChange={(kind) => update({ kind: kind === 'all' ? undefined : kind })}
            options={[
              { value: 'all', label: 'All posts' },
              { value: 'have-place', label: 'Has a place' },
              { value: 'need-place', label: 'Needs a place' },
              { value: 'group', label: 'Groups forming' },
            ]}
            className="self-start overflow-x-auto"
          />

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm">Area</span>
              <Select
                value={search.area ?? ''}
                onChange={(e) => update({ area: (e.target.value || undefined) as Neighbourhood | undefined })}
                className="min-w-52"
              >
                <option value="">Anywhere</option>
                {NEIGHBOURHOODS.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm">Budget per person</span>
              <Select
                value={search.max ?? ''}
                onChange={(e) => update({ max: e.target.value ? Number(e.target.value) : undefined })}
                className="min-w-44"
              >
                <option value="">Any budget</option>
                {BUDGETS.map((b) => (
                  <option key={b} value={b}>
                    Up to {formatPrice(b)}
                  </option>
                ))}
              </Select>
            </label>
            {anyFilter && (
              <Button color="ghost" onClick={() => update({ area: undefined, max: undefined, tag: undefined })}>
                Clear filters
              </Button>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm">Living style</p>
            <div className="flex flex-wrap gap-1.5">
              {VIBES.map((tag) => (
                <ToggleChip key={tag} pressed={Boolean(search.tag?.includes(tag))} onClick={() => toggleTag(tag)}>
                  {tag}
                </ToggleChip>
              ))}
            </div>
          </div>
        </div>

        <p aria-live="polite" className="mt-10 mb-5 text-[0.9375rem]">
          {plural(results.length, 'post')} with open spots
        </p>

        {results.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((post) => (
              <RoommatePostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start rounded-3xl bg-white p-8 shadow-card md:p-12">
            <Users size={32} aria-hidden="true" className="text-ink-faint" />
            <h2 className="mt-5 text-2xl">No posts match those filters</h2>
            <p className="mt-2 max-w-md font-text text-ink-soft">
              Fewer living-style tags usually helps. Or post your own: people looking for a housemate see new posts first.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => update({ kind: undefined, area: undefined, max: undefined, tag: undefined })}>
                Clear all filters
              </Button>
              <Link to="/post" search={{ type: 'roommate' }} className={buttonStyles({ color: 'outline' })}>
                Post a roommate ad
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
