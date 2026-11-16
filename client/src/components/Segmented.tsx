import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Option<T extends string> = { value: T; label: ReactNode };

type Props<T extends string> = {
  /** Accessible name for the group, e.g. "Listing kind". */
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * A segmented control. The dark "selected" pill is a second copy of the labels, clipped down to
 * the active one, so the text colour changes exactly where the pill's edge is as it slides.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: Props<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState<string | null>(null);
  // No slide on first paint or after a resize: only when the selection actually moves.
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const active = list.querySelector<HTMLElement>('[aria-checked="true"]');
      if (!active) return;
      const right = list.offsetWidth - active.offsetLeft - active.offsetWidth;
      const bottom = list.offsetHeight - active.offsetTop - active.offsetHeight;
      setClip(
        `inset(${active.offsetTop}px ${right}px ${bottom}px ${active.offsetLeft}px round 999px)`,
      );
    };

    measure();
    const observer = new ResizeObserver(() => {
      setAnimate(false);
      measure();
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [value, options.length]);

  function onKeyDown(event: KeyboardEvent) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length]!;
    setAnimate(true);
    onChange(next.value);
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    });
  }

  const itemStyles = 'inline-flex min-h-9 items-center justify-center rounded-full px-4 text-sm';

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('relative inline-flex max-w-full rounded-full bg-wash p-1', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => {
            setAnimate(true);
            onChange(option.value);
          }}
          className={cn(
            itemStyles,
            'whitespace-nowrap text-ink-soft transition-colors duration-150 hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}

      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 flex rounded-full bg-ink p-1 text-paper',
          animate && 'transition-[clip-path] duration-300 ease-out motion-reduce:transition-none',
        )}
        style={{ clipPath: clip ?? 'inset(50%)' }}
      >
        {options.map((option) => (
          <span key={option.value} className={cn(itemStyles, 'whitespace-nowrap')}>
            {option.label}
          </span>
        ))}
      </div>
    </div>
  );
}
