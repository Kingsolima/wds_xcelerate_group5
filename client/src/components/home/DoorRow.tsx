import type { CSSProperties } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { photoUrl, type PhotoKey } from '@/data/photos';
import { Photo } from '../Photo';

type Door = {
  label: string;
  /** Under the label: a count or a line. */
  note: string;
  link: LinkProps;
  photo: PhotoKey;
  door: string;
  ink: string;
};

/**
 * Five doors standing on the bottom edge of the hero, one per thing you can do here. Each pastel
 * is that area's colour across the whole app.
 */
export function DoorRow({ doors }: { doors: Door[] }) {
  return (
    <nav aria-label="Start here" className="flex flex-1 flex-col overflow-clip">
      <ul className="grid flex-1 grid-cols-5 items-end gap-2 sm:gap-3 lg:gap-5">
        {doors.map((d, i) => (
          <li key={d.label} className="door__rise h-full" style={{ '--i': i } as CSSProperties}>
            <Link
              {...d.link}
              className="door relative block h-full rounded-t-[0.9rem] bg-white p-1.5 pb-0 outline-offset-4 sm:p-2 sm:pb-0 lg:p-2.5 lg:pb-0"
              style={{ '--i': i } as CSSProperties}
            >
              {/* What's behind the door. */}
              <div className="relative h-full overflow-hidden rounded-t-[0.55rem] bg-ink">
                <Photo src={photoUrl(d.photo)} width={300} height={420} loading="eager" className="door__photo" />
                {/* The door itself. */}
                <div
                  className={cn(
                    'door__panel absolute inset-0 flex flex-col rounded-t-[0.55rem] p-2 sm:p-3 lg:p-4',
                    d.door,
                    d.ink,
                  )}
                >
                  <span className="door__shade pointer-events-none absolute inset-0 rounded-t-[inherit] bg-ink" />
                  <span
                    className={cn(
                      'relative font-display leading-[0.9] uppercase',
                      'text-[0.9375rem] max-sm:[writing-mode:vertical-rl] max-sm:rotate-180 max-sm:self-start',
                      'sm:text-[clamp(0.9375rem,1.7vw,1.5rem)]',
                    )}
                  >
                    {d.label}
                  </span>
                  <span className="relative mt-1.5 hidden font-text text-xs opacity-80 sm:block lg:text-[0.8125rem]">
                    {d.note}
                  </span>
                  {/* Raised panels and the knob. */}
                  <span
                    aria-hidden="true"
                    className="relative mt-auto mb-[12%] hidden h-[32%] rounded-md border-2 border-current/15 sm:block"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-[56%] right-[11%] size-2 rounded-full bg-current shadow-[0_1px_0_oklch(100%_0_0/0.5)] sm:size-3 lg:size-3.5"
                  />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
