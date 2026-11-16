import { Link } from '@tanstack/react-router';
import { BadgeCheck, Footprints } from 'lucide-react';
import type { Listing } from '@/data/data';
import { TYPE_LABELS } from '@/data/data';
import { cn } from '@/lib/cn';
import { formatDateRange, formatPrice } from '@/lib/format';
import { SaveButton } from './SaveButton';
import { Rating } from './Rating';
import { Photo } from './Photo';

export function ListingCard({
  listing,
  className,
  eager = false,
}: {
  listing: Listing;
  className?: string;
  /** Load the photo right away (for cards on the first screen). */
  eager?: boolean;
}) {
  const sublet = listing.kind === 'sublet';

  return (
    <article className={cn('group relative', className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-wash">
        <Photo
          src={listing.photos.hero.primary}
          width={420}
          height={315}
          loading={eager ? 'eager' : 'lazy'}
          className="transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {sublet && (
            <span className="inline-flex h-7 items-center rounded-full bg-mint px-2.5 font-text text-xs text-mint-ink">
              Sublet · {formatDateRange(listing.availableFrom, listing.availableTo)}
            </span>
          )}
          {listing.westernVerified && (
            <span className="inline-flex h-7 items-center gap-1 rounded-full bg-white/95 px-2.5 font-text text-xs text-purple">
              <BadgeCheck size={14} aria-hidden="true" /> Western Verified
            </span>
          )}
        </div>
        <SaveButton
          listingId={listing.id}
          listingName={listing.name}
          className="absolute top-2 right-2 z-10"
        />
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[0.9375rem] leading-snug">
            {/* The whole card is the link; the save button sits above it. */}
            <Link
              to="/listings/$listingId"
              params={{ listingId: listing.id }}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-purple"
            >
              {listing.name}
            </Link>
          </h3>
          <Rating average={listing.rating} count={listing.reviewCount} showCount={false} className="shrink-0 pt-0.5" />
        </div>
        <p className="flex flex-wrap items-center gap-x-1.5 font-text text-[0.8125rem] text-ink-soft">
          <span>{TYPE_LABELS[listing.type]}</span>
          <span aria-hidden="true">·</span>
          <span>{listing.neighbourhood}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Footprints size={13} aria-hidden="true" />
            {listing.walkMinutes} min to campus
          </span>
        </p>
        <p className="mt-0.5">
          <span className="font-display text-lg tracking-normal">{formatPrice(listing.price)}</span>
          <span className="font-text text-[0.8125rem] text-ink-soft">
            {' '}
            / month{listing.housingDetails.beds > 1 && ' per room'}
          </span>
        </p>
      </div>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[4/3] rounded-2xl" />
      <div className="skeleton mt-3 h-4 w-4/5" />
      <div className="skeleton mt-2 h-3 w-3/5" />
      <div className="skeleton mt-2 h-4 w-1/4" />
    </div>
  );
}
