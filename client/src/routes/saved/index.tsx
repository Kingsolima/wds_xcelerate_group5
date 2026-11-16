import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { DoorClosed, Heart } from 'lucide-react';
import { listingsQueryOptions, roommatePostsQueryOptions } from '@/data/queries';
import { useKnocks, useSaved } from '@/lib/store';
import { plural } from '@/lib/format';
import { buttonStyles } from '@/components/Button';
import { ListingCard } from '@/components/ListingCard';
import { PageHeader } from '@/components/PageHeader';
import { RoommatePostCard } from '@/components/RoommatePostCard';

export const Route = createFileRoute('/saved/')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(listingsQueryOptions()),
      queryClient.ensureQueryData(roommatePostsQueryOptions()),
    ]),
  component: SavedPage,
});

function SavedPage() {
  const saved = useSaved();
  const knocks = useKnocks();
  const { data: listings } = useSuspenseQuery(listingsQueryOptions());
  const { data: posts } = useSuspenseQuery(roommatePostsQueryOptions());

  // Keep the order they were saved in, newest first; skip anything that has since been taken down.
  const savedListings = saved.ids.map((id) => listings.find((l) => l.id === id)).filter((l) => l !== undefined);
  const knockedListings = knocks.ids
    .filter((id) => id.startsWith('listing:'))
    .map((id) => listings.find((l) => `listing:${l.id}` === id))
    .filter((l) => l !== undefined);
  const knockedPosts = knocks.ids
    .filter((id) => id.startsWith('post:'))
    .map((id) => posts.find((p) => `post:${p.id}` === id))
    .filter((p) => p !== undefined);
  const knockCount = knockedListings.length + knockedPosts.length;

  return (
    <>
      <PageHeader tone="lavender" title="Saved" quiet="Places you liked, doors you knocked on">
        Kept in this browser for now. Once accounts exist, they’ll follow you to your phone.
      </PageHeader>

      <div className="wrap pb-24">
        <section aria-labelledby="saved-title" className="py-12">
          <h2 id="saved-title" className="mb-8 text-2xl">
            Saved places <span className="font-quiet text-ink-soft">{savedListings.length}</span>
          </h2>
          {savedListings.length ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {savedListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <Empty
              icon={<Heart size={28} aria-hidden="true" />}
              title="Nothing saved yet"
              body="Tap the heart on any listing to keep it here and compare later."
              action={
                <Link to="/listings" className={buttonStyles()}>
                  Browse listings
                </Link>
              }
            />
          )}
        </section>

        <section aria-labelledby="knocks-title" className="border-t border-line py-12">
          <h2 id="knocks-title" className="mb-2 text-2xl">
            Knocks sent <span className="font-quiet text-ink-soft">{knockCount}</span>
          </h2>
          <p className="mb-8 font-text text-ink-soft">
            {knockCount ? `Waiting to hear back on ${plural(knockCount, 'knock')}.` : 'When you knock on a place or a roommate post, it shows up here.'}
          </p>
          {knockCount ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {knockedListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
              {knockedPosts.map((p) => (
                <RoommatePostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <Empty
              icon={<DoorClosed size={28} aria-hidden="true" />}
              title="No knocks yet"
              body="Knocking tells someone you’re interested. If they knock back, you can message each other."
              action={
                <Link to="/roommates" className={buttonStyles({ color: 'outline' })}>
                  See roommate posts
                </Link>
              }
            />
          )}
        </section>
      </div>
    </>
  );
}

function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start rounded-3xl border-2 border-dashed border-line p-8 md:p-10">
      <span className="text-ink-faint">{icon}</span>
      <p className="mt-4 text-xl">{title}</p>
      <p className="mt-1 max-w-md font-text text-ink-soft">{body}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}
