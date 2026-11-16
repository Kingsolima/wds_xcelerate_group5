import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Tone } from './Chip';

const grounds: Partial<Record<Tone, string>> = {
  lavender: 'bg-lavender text-lavender-ink',
  mint: 'bg-mint text-mint-ink',
  peach: 'bg-peach text-peach-ink',
  butter: 'bg-butter text-butter-ink',
  sky: 'bg-sky text-sky-ink',
};

/**
 * Top of an app page: a heavy title with an optional light second half, a line under it, and
 * actions on the right. Each area's pastel is its ground.
 */
export function PageHeader({
  title,
  quiet,
  children,
  actions,
  tone = 'lavender',
  className,
}: {
  title: string;
  /** Second half of the title, set light. */
  quiet?: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn(grounds[tone], className)}>
      <div className="wrap flex flex-col gap-6 pt-10 pb-8 md:flex-row md:items-end md:justify-between md:pt-14">
        <div className="max-w-3xl">
          <h1 className="text-[2.5rem] leading-[0.95] tracking-[-0.02em] uppercase md:text-6xl">
            <span className="font-display">{title}</span>
            {quiet && <span className="font-quiet block normal-case">{quiet}</span>}
          </h1>
          {children && <div className="mt-4 max-w-xl font-text text-[0.9375rem] leading-relaxed opacity-85">{children}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
