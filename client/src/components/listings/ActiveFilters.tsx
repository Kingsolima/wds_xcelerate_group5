import { X } from 'lucide-react';
import { AMENITY_LABELS, TYPE_LABELS } from '@/data/data';
import type { ListingSearch } from '@/lib/filters';
import { formatPrice } from '@/lib/format';
import type { SearchPatch } from './FilterPanel';

type Pill = { key: string; label: string; remove: SearchPatch };

/** One pill per filter that is on, so each can be removed on its own. */
export function filterPills(search: ListingSearch): Pill[] {
  const pills: Pill[] = [];
  const without = <T,>(list: T[] | undefined, value: T) => {
    const next = list?.filter((v) => v !== value);
    return next?.length ? next : undefined;
  };

  if (search.q) pills.push({ key: 'q', label: `“${search.q}”`, remove: { q: undefined } });
  if (search.max) pills.push({ key: 'max', label: `Up to ${formatPrice(search.max)}`, remove: { max: undefined } });
  if (search.beds) pills.push({ key: 'beds', label: `${search.beds}+ bedrooms`, remove: { beds: undefined } });
  if (search.walk) pills.push({ key: 'walk', label: `${search.walk} min walk or less`, remove: { walk: undefined } });
  if (search.verified) pills.push({ key: 'verified', label: 'Western Verified', remove: { verified: undefined } });
  if (search.furnished) pills.push({ key: 'furnished', label: 'Furnished', remove: { furnished: undefined } });
  if (search.utilities) pills.push({ key: 'utilities', label: 'Utilities included', remove: { utilities: undefined } });
  search.type?.forEach((t) => pills.push({ key: `type-${t}`, label: TYPE_LABELS[t], remove: { type: without(search.type, t) } }));
  search.area?.forEach((a) => pills.push({ key: `area-${a}`, label: a, remove: { area: without(search.area, a) } }));
  search.amenities?.forEach((a) =>
    pills.push({ key: `amenity-${a}`, label: AMENITY_LABELS[a], remove: { amenities: without(search.amenities, a) } }),
  );
  return pills;
}

export function ActiveFilters({
  search,
  onChange,
  onClear,
}: {
  search: ListingSearch;
  onChange: (patch: SearchPatch) => void;
  onClear: () => void;
}) {
  const pills = filterPills(search);
  if (!pills.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul aria-label="Filters on" className="contents">
        {pills.map((pill) => (
          <li key={pill.key}>
            <button
              type="button"
              onClick={() => onChange(pill.remove)}
              aria-label={`Remove filter: ${pill.label}`}
              className="inline-flex min-h-9 animate-fade items-center gap-1.5 rounded-full bg-ink py-1 pr-2.5 pl-3.5 text-sm text-paper transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              {pill.label}
              <X size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClear}
        className="min-h-9 rounded-lg px-2 text-sm underline underline-offset-4 hover:bg-wash"
      >
        Clear all
      </button>
    </div>
  );
}
