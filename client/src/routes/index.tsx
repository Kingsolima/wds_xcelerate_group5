import type { CSSProperties, ReactNode } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, MessageSquareText, ShieldCheck } from 'lucide-react';
import {
  listingsQueryOptions,
  reviewsQueryOptions,
  roommatePostsQueryOptions,
} from '@/data/queries';
import { photoUrl } from '@/data/photos';
import { spotsOpen } from '@/data/data';
import { sortListings } from '@/lib/filters';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { BRAND } from '@/lib/brand';
import { buttonStyles } from '@/components/Button';
import { DoorRow } from '@/components/home/DoorRow';
import { HeroSearch } from '@/components/home/HeroSearch';
import { ListingCard } from '@/components/ListingCard';
import { ReviewCard } from '@/components/ReviewCard';
import { RoommatePostCard } from '@/components/RoommatePostCard';
import { Photo } from '@/components/Photo';

export const Route = createFileRoute('/')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(listingsQueryOptions()),
      queryClient.ensureQueryData(reviewsQueryOptions()),
      queryClient.ensureQueryData(roommatePostsQueryOptions()),
    ]),
  component: Home,
});

// Reviews picked for the home page: two good, one that warns you off. Honest beats glowing.
const FEATURED_REVIEWS = ['r7', 'r26', 'r23'];

function Home() {
  const { data: listings } = useSuspenseQuery(listingsQueryOptions());
  const { data: reviews } = useSuspenseQuery(reviewsQueryOptions());
  const { data: posts } = useSuspenseQuery(roommatePostsQueryOptions());

  const leases = listings.filter((l) => l.kind === 'lease');
  const sublets = listings.filter((l) => l.kind === 'sublet');
  const openPosts = posts.filter((p) => spotsOpen(p) > 0);
  const nameOf = (id: string) => listings.find((l) => l.id === id)?.name;
  const featured = FEATURED_REVIEWS.map((id) => reviews.find((r) => r.id === id)).filter((r) => r !== undefined);

  return (
    <>
      {/* ---------- Hero: the purple wall and its doors ---------- */}
      <section
        aria-labelledby="hero-title"
        className="on-dark flex min-h-[calc(100svh-4rem)] flex-col bg-purple text-white"
      >
        <div className="wrap flex flex-1 flex-col pt-6 md:pt-10">
          <div className="grid gap-x-12 gap-y-5 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-end">
            <h1
              id="hero-title"
              className="font-display text-[clamp(2.75rem,8.4vw,6rem)] leading-[0.88] tracking-[-0.025em] uppercase"
            >
              <span className="line-rise">
                <span>Less hunting,</span>
              </span>
              <span className="line-rise">
                <span style={{ '--d': '90ms' } as CSSProperties}>more living</span>
              </span>
            </h1>
            <div className="fade-up pb-1" style={{ '--d': '220ms' } as CSSProperties}>
              <p className="font-text text-[0.9375rem] leading-relaxed text-white/85 md:text-base">
                Houses, sublets and housemates near {BRAND.school}, with reviews from the students who
                lived there.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-mint" aria-hidden="true" />
                {plural(listings.length, 'place')} open for 2027, {sublets.length} of them sublets
              </p>
            </div>
          </div>

          <HeroSearch className="fade-up mt-6 md:mt-8" style={{ '--d': '300ms' } as CSSProperties} />

          <div className="mt-auto flex min-h-48 flex-1 flex-col pt-8 md:pt-10 lg:max-h-[34rem]">
            <DoorRow
              doors={[
                {
                  label: 'Leases',
                  note: `${leases.length} houses and apartments`,
                  link: { to: '/listings', search: { kind: 'lease' } },
                  photo: 'livingPlants',
                  door: 'bg-lavender',
                  ink: 'text-lavender-ink',
                },
                {
                  label: 'Sublets',
                  note: `${sublets.length} rooms for co-op terms`,
                  link: { to: '/listings', search: { kind: 'sublet' } },
                  photo: 'bedWhite',
                  door: 'bg-mint',
                  ink: 'text-mint-ink',
                },
                {
                  label: 'Housemates',
                  note: `${openPosts.length} houses forming`,
                  link: { to: '/roommates' },
                  photo: 'cookingTogether',
                  door: 'bg-peach',
                  ink: 'text-peach-ink',
                },
                {
                  label: 'Reviews',
                  note: `${reviews.length} from past tenants`,
                  link: { to: '/reviews' },
                  photo: 'livingFireplace',
                  door: 'bg-butter',
                  ink: 'text-butter-ink',
                },
                {
                  label: 'Post a place',
                  note: 'Sublet, list, or find people',
                  link: { to: '/post' },
                  photo: 'roomEmpty',
                  door: 'bg-sky',
                  ink: 'text-sky-ink',
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---------- Listings ---------- */}
      <Band tone="paper" labelledBy="near-campus">
        <SectionHeading id="near-campus" title="Places near campus" quiet="Sorted by walk and reviews">
          <Link to="/listings" className={buttonStyles({ color: 'outline' })}>
            See all {listings.length} listings <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </SectionHeading>

        <ul aria-label="Quick filters" className="-mx-1 mt-6 flex flex-wrap gap-2 px-1">
          {(
            [
              ['Under $700', { max: 700 }],
              ['10 min walk or less', { walk: 10 }],
              ['Western Verified', { verified: true }],
              ['Furnished', { furnished: true }],
              ['Five bedrooms or more', { beds: 5 }],
            ] as const
          ).map(([label, search]) => (
            <li key={label}>
              <Link
                to="/listings"
                search={search}
                className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm inset-ring inset-ring-line transition-[box-shadow,transform] duration-150 ease-out hover:inset-ring-ink-faint active:scale-[0.97]"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {sortListings(leases).slice(0, 8).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </Band>

      {/* ---------- Reviews ---------- */}
      <Band tone="butter" labelledBy="reviews-title">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
          <div>
            <SectionHeading id="reviews-title" title="Read the reviews" quiet="before you sign" />
            <p className="mt-4 max-w-sm font-text leading-relaxed text-butter-ink">
              Every review comes from a student who lived there, scored on the landlord, the condition,
              the value and the noise. The bad ones stay up.
            </p>
            <ul className="mt-6 space-y-3 font-text text-sm text-butter-ink">
              <li className="flex gap-3">
                <ShieldCheck size={18} aria-hidden="true" className="shrink-0" />
                Reviewers sign in with a @uwo.ca email
              </li>
              <li className="flex gap-3">
                <MessageSquareText size={18} aria-hidden="true" className="shrink-0" />
                Landlords can reply, but can’t remove a review
              </li>
            </ul>
            <Link to="/reviews" className={buttonStyles({ color: 'ink', className: 'mt-8' })}>
              Read all {reviews.length} reviews <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((review) => (
              <ReviewCard key={review.id} review={review} listingName={nameOf(review.listingId)} />
            ))}
          </div>
        </div>
      </Band>

      {/* ---------- Housemates ---------- */}
      <Band tone="peach" labelledBy="housemates-title">
        <SectionHeading id="housemates-title" title="Housemates wanted" quiet="Houses forming for 2027–28">
          <Link to="/post" search={{ type: 'roommate' }} className={buttonStyles({ color: 'outline' })}>
            Post a roommate ad
          </Link>
          <Link to="/roommates" className={buttonStyles({ color: 'ink' })}>
            See all posts <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </SectionHeading>
        <p className="mt-4 max-w-xl font-text leading-relaxed text-peach-ink">
          Knock on a post to show you’re interested. If they knock back, you can message each other.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {openPosts.slice(0, 3).map((post) => (
            <RoommatePostCard key={post.id} post={post} />
          ))}
        </div>
      </Band>

      {/* ---------- Sublets ---------- */}
      <Band tone="mint" labelledBy="sublets-title">
        <SectionHeading id="sublets-title" title="Sublets for co-op terms" quiet="Rooms open while someone is away">
          <Link to="/post" search={{ type: 'sublet' }} className={buttonStyles({ color: 'outline' })}>
            Sublet your room
          </Link>
          <Link to="/listings" search={{ kind: 'sublet' }} className={buttonStyles({ color: 'ink' })}>
            See all sublets <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </SectionHeading>
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {sortListings(sublets, 'newest').slice(0, 4).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </Band>

      {/* ---------- Landlords ---------- */}
      <Band tone="sky" labelledBy="landlords-title">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading id="landlords-title" title="Landlords" quiet="List a place for Western students" />
            <p className="mt-4 max-w-md font-text leading-relaxed text-sky-ink">
              Post your property with photos, rent and lease dates. If it is already on Western’s
              Off-Campus Housing list, it gets the Western Verified badge.
            </p>
            <div className="mt-6 inline-flex items-center gap-3 rounded-xl bg-white px-4 py-3">
              <BadgeCheck size={22} className="text-purple" aria-hidden="true" />
              <span className="text-sm">
                Western Verified
                <span className="block font-text text-xs text-ink-soft">
                  Checked against Off-Campus Housing’s listings
                </span>
              </span>
            </div>
            <div className="mt-8">
              <Link to="/post" search={{ type: 'listing' }} className={buttonStyles({ color: 'ink', size: 'lg' })}>
                List a property
              </Link>
            </div>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-3xl">
            <Photo src={photoUrl('porchDoor')} width={640} height={480} />
          </div>
        </div>
      </Band>
    </>
  );
}

const bands = {
  paper: 'bg-paper',
  butter: 'bg-butter',
  peach: 'bg-peach',
  mint: 'bg-mint',
  sky: 'bg-sky',
} as const;

function Band({
  tone,
  labelledBy,
  children,
}: {
  tone: keyof typeof bands;
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={labelledBy} className={cn('py-20 md:py-28', bands[tone])}>
      <div className="wrap">{children}</div>
    </section>
  );
}

function SectionHeading({
  id,
  title,
  quiet,
  children,
}: {
  id: string;
  title: string;
  quiet?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <h2 id={id} className="text-[2.25rem] leading-[0.95] tracking-[-0.02em] md:text-5xl">
        <span className="font-display uppercase">{title}</span>
        {quiet && <span className="font-quiet mt-1 block text-[0.62em] leading-tight">{quiet}</span>}
      </h2>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
