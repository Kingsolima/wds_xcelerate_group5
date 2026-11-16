import { SCORE_KEYS, SCORE_LABELS } from '@/data/data';
import type { RatingSummary } from '@/data/api';
import { plural } from '@/lib/format';
import { Stars } from './Rating';

/** The big number, the star spread, and the four scores. */
export function RatingBreakdown({ summary }: { summary: RatingSummary }) {
  if (summary.count === 0) return null;
  const most = Math.max(...summary.distribution, 1);

  return (
    <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
      <div>
        <p className="font-display text-7xl tabular-nums">{summary.average.toFixed(1)}</p>
        <Stars value={summary.average} size={18} className="mt-2" />
        <p className="mt-1 font-text text-sm text-ink-soft">
          from {plural(summary.count, 'review')}
        </p>
      </div>
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        <dl className="space-y-1.5">
          {summary.distribution.map((count, i) => (
            <div key={i} className="flex items-center gap-3 font-text text-xs">
              <dt className="w-12 shrink-0 text-ink-soft">{5 - i} stars</dt>
              <dd className="flex flex-1 items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-wash">
                  <span
                    className="block h-full origin-left rounded-full bg-ink"
                    style={{ transform: `scaleX(${count / most})` }}
                  />
                </span>
                <span className="w-4 text-right tabular-nums">{count}</span>
              </dd>
            </div>
          ))}
        </dl>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {SCORE_KEYS.map((key) => (
            <div key={key} className="border-l border-line pl-3">
              <dt className="font-text text-xs text-ink-soft">{SCORE_LABELS[key]}</dt>
              <dd className="font-display text-2xl tabular-nums">{summary.scores[key].toFixed(1)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
