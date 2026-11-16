import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Review } from '@/data/data';
import { cn } from '@/lib/cn';
import { Avatar } from './Avatar';
import { Stars } from './Rating';

export function ReviewCard({
  review,
  listingName,
  clamp = true,
  className,
}: {
  review: Review;
  /** Shown (and linked) when the card appears away from its listing. */
  listingName?: string;
  clamp?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const long = review.body.length > 220;

  return (
    <article className={cn('flex flex-col rounded-2xl bg-white p-5 shadow-card md:p-6', className)}>
      <div className="flex items-center gap-2">
        <Stars value={review.rating} />
        <span className="sr-only">{review.rating} out of 5</span>
        <span className="font-text text-xs text-ink-faint">Lived there {review.livedThere}</span>
      </div>
      <h3 className="mt-3 text-lg leading-snug">{review.title}</h3>
      <p
        className={cn(
          'mt-2 font-text text-[0.9375rem] leading-relaxed text-ink-soft',
          clamp && long && !open && 'line-clamp-4',
        )}
      >
        {review.body}
      </p>
      {clamp && long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="mt-1 self-start rounded py-1 text-sm underline underline-offset-4"
        >
          {open ? 'Show less' : 'Read the whole review'}
        </button>
      )}
      <div className="mt-auto flex items-center gap-3 pt-5">
        <Avatar name={review.author.name} size="sm" />
        <p className="min-w-0 font-text text-[0.8125rem] leading-tight">
          <span className="block truncate text-ink">{review.author.name}</span>
          <span className="block truncate text-ink-faint">{review.author.detail}</span>
        </p>
      </div>
      {listingName && (
        <Link
          to="/listings/$listingId"
          params={{ listingId: review.listingId }}
          className="mt-4 truncate border-t border-line pt-3 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          {listingName}
        </Link>
      )}
    </article>
  );
}
