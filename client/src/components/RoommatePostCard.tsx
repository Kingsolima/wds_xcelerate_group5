import { Link } from '@tanstack/react-router';
import { CalendarDays, MapPin } from 'lucide-react';
import { POST_KIND_LABELS, spotsOpen, type RoommatePost } from '@/data/data';
import { cn } from '@/lib/cn';
import { formatMonth, formatPrice, plural, timeAgo } from '@/lib/format';
import { Avatar } from './Avatar';
import { Chip, type Tone } from './Chip';
import { JoinGroupButton } from './JoinGroupButton';
import { KnockButton } from './KnockButton';

const kindTone: Record<RoommatePost['kind'], Tone> = {
  'have-place': 'peach',
  'need-place': 'sky',
  group: 'lavender',
};

export function RoommatePostCard({ post, className }: { post: RoommatePost; className?: string }) {
  const open = spotsOpen(post);

  return (
    <article className={cn('flex flex-col rounded-2xl bg-white p-5 shadow-card md:p-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <Chip tone={kindTone[post.kind]}>{POST_KIND_LABELS[post.kind]}</Chip>
        <span className="font-text text-xs text-ink-faint">{timeAgo(post.postedAt)}</span>
      </div>

      <h3 className="mt-4 text-lg leading-snug">{post.title}</h3>
      <p className="mt-2 line-clamp-3 font-text text-[0.9375rem] leading-relaxed text-ink-soft">{post.body}</p>

      {/* Who's in, and how many spots are left, drawn as seats. */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex -space-x-2">
          {post.members.slice(0, 5).map((member) => (
            <Avatar key={member} name={member} size="sm" className="ring-2 ring-white" />
          ))}
          {Array.from({ length: Math.min(open, 5) }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="size-7 rounded-full border-2 border-dashed border-line bg-white"
            />
          ))}
        </div>
        <p className="font-text text-[0.8125rem] text-ink-soft">
          {open > 0 ? `${plural(open, 'spot')} open of ${post.spotsTotal}` : 'Full'}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 font-text text-[0.8125rem]">
        <div>
          <dt className="text-ink-faint">Budget</dt>
          <dd className="tabular-nums">{formatPrice(post.budget)} / month</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Move in</dt>
          <dd className="inline-flex items-center gap-1">
            <CalendarDays size={13} aria-hidden="true" />
            {formatMonth(post.moveIn)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="sr-only">Areas</dt>
          <dd className="inline-flex items-start gap-1 text-ink-soft">
            <MapPin size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
            {post.neighbourhoods.join(', ')}
          </dd>
        </div>
      </dl>

      <ul aria-label="About them" className="mt-4 flex flex-wrap gap-1.5">
        {post.tags.map((tag) => (
          <li key={tag}>
            <Chip>{tag}</Chip>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <p className="min-w-0 font-text text-[0.8125rem] leading-tight">
          <span className="block truncate">{post.author.name}</span>
          <span className="block truncate text-ink-faint">{post.author.detail}</span>
        </p>
        {post.listingId && (
          <Link
            to="/listings/$listingId"
            params={{ listingId: post.listingId }}
            className="shrink-0 text-sm underline underline-offset-4"
          >
            See the place
          </Link>
        )}
      </div>
      {/* Posts from the API are real groups you can join; the seed posts only take knocks. */}
      {post.memberIds ? (
        <JoinGroupButton post={post} className="mt-4 w-full" />
      ) : (
        <KnockButton id={`post:${post.id}`} name={post.title} className="mt-4 w-full" />
      )}
    </article>
  );
}
