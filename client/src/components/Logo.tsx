import { cn } from '@/lib/cn';
import { BRAND } from '@/lib/brand';

/** A door with its knob, then the name. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 20 28" aria-hidden="true" className="h-6 w-auto">
        <rect x="1" y="1" width="18" height="26" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="4.5" y="4.5" width="11" height="8" rx="1" fill="currentColor" opacity=".35" />
        <circle cx="14.5" cy="16.5" r="1.6" fill="currentColor" />
      </svg>
      <span className="font-display text-[1.375rem] tracking-[-0.03em] uppercase">{BRAND.name}</span>
    </span>
  );
}
