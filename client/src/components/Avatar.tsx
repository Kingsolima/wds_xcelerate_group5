import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

const palette = [
  'bg-lavender text-lavender-ink',
  'bg-mint text-mint-ink',
  'bg-peach text-peach-ink',
  'bg-butter text-butter-ink',
  'bg-sky text-sky-ink',
];

const sizes = {
  sm: 'size-7 text-[0.6875rem]',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
};

/** Initials on a pastel disc. The colour is picked from the name, so a person keeps theirs. */
export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-normal',
        palette[hash % palette.length],
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
