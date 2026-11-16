import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'purple' | 'lavender' | 'mint' | 'peach' | 'butter' | 'sky';

const tones: Record<Tone, string> = {
  neutral: 'bg-wash text-ink-soft',
  purple: 'bg-purple text-white',
  lavender: 'bg-lavender text-lavender-ink',
  mint: 'bg-mint text-mint-ink',
  peach: 'bg-peach text-peach-ink',
  butter: 'bg-butter text-butter-ink',
  sky: 'bg-sky text-sky-ink',
};

/** A small, static label. */
export function Chip({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2.5 font-text text-xs whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A chip you can switch on and off (filters, tags). */
export function ToggleChip({
  pressed,
  className,
  children,
  ...props
}: Omit<ComponentProps<'button'>, 'type'> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm whitespace-nowrap select-none',
        'transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.97]',
        pressed
          ? 'bg-ink text-paper'
          : 'bg-white text-ink inset-ring inset-ring-line hover:inset-ring-ink-faint',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
