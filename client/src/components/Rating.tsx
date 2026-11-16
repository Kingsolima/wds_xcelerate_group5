import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';

/** Five stars, filled to the value (halves and quarters included). Decorative: pair it with text. */
export function Stars({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const fill = `${Math.max(0, Math.min(5, value)) * 20}%`;
  const row = Array.from({ length: 5 }, (_, i) => (
    <Star key={i} size={size} strokeWidth={0} className="shrink-0 fill-current" />
  ));

  return (
    <span aria-hidden="true" className={cn('relative inline-flex text-line', className)}>
      {row}
      <span
        className="absolute inset-y-0 left-0 inline-flex overflow-hidden text-purple"
        style={{ width: fill }}
      >
        {row}
      </span>
    </span>
  );
}

/** "★ 4.6 (12 reviews)" for cards and headers. */
export function Rating({
  average,
  count,
  showCount = true,
  className,
}: {
  average: number;
  count: number;
  showCount?: boolean;
  className?: string;
}) {
  if (count === 0) {
    return <span className={cn('font-text text-sm text-ink-faint', className)}>No reviews yet</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-sm tabular-nums', className)}>
      <Star size={13} strokeWidth={0} aria-hidden="true" className="fill-purple" />
      <span>
        <span className="sr-only">Rated </span>
        {average.toFixed(1)}
        <span className="sr-only"> out of 5</span>
      </span>
      {showCount && (
        <span className="font-text text-ink-faint">
          ({plural(count, 'review')})
        </span>
      )}
    </span>
  );
}
