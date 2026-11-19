import { useRef, useState, type ReactNode } from 'react';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  Bath,
  BadgeCheck,
  BedDouble,
  Bus,
  CalendarDays,
  ChevronLeft,
  DoorOpen,
  Footprints,
  Info,
  Plug,
  Share,
  ShoppingBasket,
  Sofa,
} from 'lucide-react';
import { AMENITY_LABELS, TYPE_LABELS } from '@/data/data';
import { NotFoundError, isServerId, ratingFor } from '@/data/api';
import {
  landlordsQueryOptions,
  listingQueryOptions,
  reviewsQueryOptions,
  roommatePostsQueryOptions,
} from '@/data/queries';
import { cn } from '@/lib/cn';
import { formatDate, formatDateRange, formatPrice, plural } from '@/lib/format';
import { Button } from '@/components/Button';
import { KnockButton } from '@/components/KnockButton';
import { LandlordCard } from '@/components/LandlordCard';
import { NotFound } from '@/components/NotFound';
import { PhotoGallery } from '@/components/PhotoGallery';
import { Rating } from '@/components/Rating';
import { RatingBreakdown } from '@/components/RatingBreakdown';
import { ReviewCard } from '@/components/ReviewCard';
import { ReviewForm } from '@/components/ReviewForm';
import { RoommatePostCard } from '@/components/RoommatePostCard';
import { SaveButton } from '@/components/SaveButton';
import { Photo } from '@/components/Photo';

export const Route = createFileRoute('/listings/$listingId')({
  loader: async ({ context: { queryClient }, params: { listingId } }) => {
    try {
      await queryClient.ensureQueryData(listingQueryOptions(listingId));
    } catch (error) {
      if (error instanceof NotFoundError) throw notFound();
      throw error;
    }
    await Promise.all([
      queryClient.ensureQueryData(reviewsQueryOptions()),
      queryClient.ensureQueryData(landlordsQueryOptions()),
      queryClient.ensureQueryData(roommatePostsQueryOptions()),
    ]);
  },
  notFoundComponent: () => (
    <NotFound title="Listing not found" body="It may have been rented, or the link is wrong." />
  ),
  component: ListingPage,
});

function ListingPage() {
  const { listingId } = Route.useParams();
  const { data: listing } = useSuspenseQuery(listingQueryOptions(listingId));
  const { data: allReviews } = useSuspenseQuery(reviewsQueryOptions());
  const { data: landlords } = useSuspenseQuery(landlordsQueryOptions());
  const { data: posts } = useSuspenseQuery(roommatePostsQueryOptions());

  const reviews = allReviews.filter((r) => r.listingId === listing.id);
  const summary = ratingFor(reviews);
  const landlord = landlords.find((l) => l.id === listing.landlordId);
  const housematePosts = posts.filter((p) => p.listingId === listing.id);
  const sublet = listing.kind === 'sublet';
  const { beds, baths, roomsOpen } = listing.housingDetails;
  const knockId = `listing:${listing.id}`;

  const [writing, setWriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const reviewsRef = useRef<HTMLElement>(null);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: listing.name, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="pb-28 lg:pb-24">
      <div className="wrap pt-6">
        <Link
          to="/listings"
          search={sublet ? { kind: 'sublet' } : {}}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-ink-soft hover:bg-wash hover:text-ink"
        >
          <ChevronLeft size={16} aria-hidden="true" /> {sublet ? 'All sublets' : 'All listings'}
        </Link>

        {/* Title */}
        <div className="mt-3 mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-[2rem] leading-none tracking-[-0.02em] md:text-[2.75rem]">
              {listing.name}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem]">
              <button
                type="button"
                onClick={() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="rounded underline-offset-4 hover:underline"
              >
                <Rating average={summary.average} count={summary.count} />
              </button>
              <span className="text-ink-soft">{listing.address}</span>
              {listing.westernVerified && (
                <span className="inline-flex items-center gap-1 text-purple">
                  <BadgeCheck size={16} aria-hidden="true" /> Western Verified
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button color="ghost" size="sm" className="min-h-11" onClick={share}>
              <Share size={16} aria-hidden="true" /> <span aria-live="polite">{copied ? 'Link copied' : 'Share'}</span>
            </Button>
            <SaveButton listingId={listing.id} listingName={listing.name} className="shadow-none inset-ring inset-ring-line" />
          </div>
        </div>

        <PhotoGallery name={listing.name} photos={[...listing.photos.hero.photos, ...listing.photos.tour.photos]} />
      </div>

      <div className="wrap mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20">
        <div className="min-w-0">
          {/* Overview */}
          <Section>
            <h2 className="text-2xl">
              {TYPE_LABELS[listing.type]} in {listing.neighbourhood}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem]">
              <Fact icon={<BedDouble size={18} />}>{plural(beds, 'bedroom')}</Fact>
              <Fact icon={<Bath size={18} />}>{plural(baths, 'bathroom')}</Fact>
              <Fact icon={<DoorOpen size={18} />}>
                {roomsOpen === beds && beds > 1 ? 'Whole place available' : `${plural(roomsOpen, 'room')} open`}
              </Fact>
            </ul>
            <p className="mt-5 max-w-[65ch] font-text leading-relaxed text-ink-soft">{listing.description}</p>
            {sublet && listing.postedBy && !isServerId(listing.postedBy) && (
              <p className="mt-4 font-text text-sm text-ink-soft">Posted by {listing.postedBy}, who is subletting their own room.</p>
            )}
          </Section>

          {listing.westernVerified ? (
            <div className="mb-10 flex items-start gap-4 rounded-2xl bg-lavender p-5 text-lavender-ink">
              <BadgeCheck size={28} aria-hidden="true" className="shrink-0" />
              <div>
                <p className="text-lg text-ink">Western Verified</p>
                <p className="mt-1 font-text text-sm">
                  This address is on Western’s Off-Campus Housing listings, and the landlord’s details match.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-10 flex items-start gap-4 rounded-2xl bg-wash p-5">
              <Info size={24} aria-hidden="true" className="shrink-0 text-ink-soft" />
              <p className="font-text text-sm text-ink-soft">
                {sublet
                  ? 'Sublets are posted by students. Ask to see the original lease, and check that it allows subletting.'
                  : 'This listing isn’t on Western’s Off-Campus Housing list. That doesn’t mean anything is wrong; read the reviews and visit before you sign.'}
              </p>
            </div>
          )}

          {/* Getting around */}
          <Section title="Getting around">
            <div className="grid gap-3 sm:grid-cols-3">
              <Distance icon={<Footprints size={22} />} minutes={listing.walkMinutes} label="walk to campus" />
              <Distance icon={<Bus size={22} />} minutes={listing.busMinutes} label="by bus to campus" />
              <Distance icon={<ShoppingBasket size={22} />} minutes={listing.groceryMinutes} label="walk to groceries" />
            </div>
          </Section>

          {/* Amenities */}
          <Section title="What this place has">
            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Fact icon={<Sofa size={18} />} off={!listing.furnished}>
                {listing.furnished ? 'Furnished' : 'Unfurnished'}
              </Fact>
              <Fact icon={<Plug size={18} />} off={!listing.utilitiesIncluded}>
                {listing.utilitiesIncluded ? 'Utilities included' : 'Utilities extra'}
              </Fact>
              {listing.amenities.map((a) => (
                <Fact key={a}>{AMENITY_LABELS[a]}</Fact>
              ))}
            </ul>
          </Section>

          {/* Tour */}
          {listing.photos.tour.photos.length > 0 && (
            <Section title={listing.photos.tour.name}>
              <p className="-mt-2 mb-5 font-text text-ink-soft">{listing.photos.tour.description}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {listing.photos.tour.photos.map((src) => (
                  <div key={src} className="aspect-[4/3] overflow-hidden rounded-xl">
                    <Photo src={src} width={300} height={225} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Reviews */}
          <section ref={reviewsRef} aria-labelledby="reviews-heading" className="scroll-mt-24 border-t border-line py-10">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 id="reviews-heading" className="text-2xl">
                Reviews from past tenants
              </h2>
              {!writing && (
                <Button color="outline" onClick={() => setWriting(true)}>
                  Write a review
                </Button>
              )}
            </div>
            {writing && (
              <div className="mb-10">
                <ReviewForm listingId={listing.id} onDone={() => setWriting(false)} />
              </div>
            )}
            {summary.count > 0 ? (
              <>
                <RatingBreakdown summary={summary} />
                <div className="mt-10 grid gap-4 md:grid-cols-2">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              </>
            ) : (
              !writing && (
                <div className="rounded-2xl bg-butter p-6 text-butter-ink">
                  <p className="text-lg text-ink">No reviews yet</p>
                  <p className="mt-1 font-text text-sm">
                    Lived here? A short review helps the next person decide.{' '}
                    {landlord && 'Check the landlord’s other places below in the meantime.'}
                  </p>
                </div>
              )
            )}
          </section>

          {landlord && (
            <Section title={sublet ? 'The landlord on the original lease' : 'Landlord'}>
              <LandlordCard landlord={landlord} />
            </Section>
          )}

          {housematePosts.length > 0 && (
            <Section title="People looking for housemates here">
              <div className="grid gap-4 md:grid-cols-2">
                {housematePosts.map((post) => (
                  <RoommatePostCard key={post.id} post={post} />
                ))}
              </div>
            </Section>
          )}

          <Section title="Where it is">
            <p className="-mt-2 mb-5 font-text text-ink-soft">{listing.address}, London, Ontario. The exact address is shared after you knock.</p>
            <iframe
              title={`Map of ${listing.address}`}
              className="h-80 w-full rounded-2xl border-0 bg-wash md:h-[26rem]"
              loading="lazy"
              src={`https://www.google.com/maps?q=${encodeURIComponent(`${listing.address}, London, Ontario`)}&output=embed`}
            />
          </Section>
        </div>

        {/* Summary: sticky beside the content on desktop. */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl bg-white p-6 shadow-lift">
            <SummaryPrice price={listing.price} perRoom={beds > 1} />
            <dl className="mt-5 divide-y divide-line rounded-2xl text-sm inset-ring inset-ring-line">
              <SummaryRow label={sublet ? 'Dates' : 'Available'}>
                <CalendarDays size={15} aria-hidden="true" className="text-ink-soft" />
                {sublet ? formatDateRange(listing.availableFrom, listing.availableTo) : `From ${formatDate(listing.availableFrom)}`}
              </SummaryRow>
              <SummaryRow label="Lease">{sublet ? `${listing.lease}-month sublet` : `${listing.lease} months`}</SummaryRow>
              <SummaryRow label="Rooms open">{`${roomsOpen} of ${beds}`}</SummaryRow>
            </dl>
            <KnockButton id={knockId} name={listing.name} size="lg" className="mt-5 w-full" />
            <p className="mt-3 text-center font-text text-xs text-ink-soft">
              Knocking tells the {sublet ? 'student' : 'landlord'} you’re interested. Nothing is binding.
            </p>
          </div>
        </aside>
      </div>

      {/* Phone and tablet: price and Knock stay in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        <div className="wrap flex items-center justify-between gap-4 py-3">
          <div>
            <SummaryPrice price={listing.price} perRoom={beds > 1} compact />
            <p className="font-text text-xs text-ink-soft">
              {sublet ? formatDateRange(listing.availableFrom, listing.availableTo) : `From ${formatDate(listing.availableFrom)}`}
            </p>
          </div>
          <KnockButton id={knockId} name={listing.name} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={cn('pb-10', title && 'border-t border-line pt-10')}>
      {title && <h2 className="mb-6 text-2xl">{title}</h2>}
      {children}
    </section>
  );
}

function Fact({ icon, off, children }: { icon?: ReactNode; off?: boolean; children: ReactNode }) {
  return (
    <li className={cn('flex items-center gap-2.5', off && 'text-ink-faint')}>
      <span aria-hidden="true" className="text-ink-soft">
        {icon ?? <span className="block size-1.5 rounded-full bg-current" />}
      </span>
      {children}
    </li>
  );
}

function Distance({ icon, minutes, label }: { icon: ReactNode; minutes: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <span aria-hidden="true" className="text-ink-soft">
        {icon}
      </span>
      <p className="mt-3 font-display text-3xl tabular-nums tracking-normal">
        {minutes}
        <span className="font-quiet text-lg"> min</span>
      </p>
      <p className="font-text text-sm text-ink-soft">{label}</p>
    </div>
  );
}

function SummaryPrice({ price, perRoom, compact }: { price: number; perRoom: boolean; compact?: boolean }) {
  return (
    <p>
      <span className={cn('font-display tracking-normal', compact ? 'text-xl' : 'text-3xl')}>{formatPrice(price)}</span>
      <span className="font-text text-sm text-ink-soft"> / month{perRoom && ' per room'}</span>
    </p>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="inline-flex items-center gap-1.5 text-right">{children}</dd>
    </div>
  );
}
