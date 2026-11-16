import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Check as CheckIcon } from 'lucide-react';
import {
  AMENITIES,
  AMENITY_LABELS,
  LISTING_TYPES,
  NEIGHBOURHOODS,
  TYPE_LABELS,
} from '@/data/data';
import type { ListingSearch } from '@/lib/filters';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { ToggleChip } from '../Chip';

export type SearchPatch = Partial<ListingSearch>;

const RENT_MIN = 400;
const RENT_MAX = 1500;
const RENT_STEP = 25;

/** Adds or removes one value from a list param. */
function toggleIn<T>(list: T[] | undefined, value: T) {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value];
  return next.length ? next : undefined;
}

export function FilterPanel({
  search,
  onChange,
}: {
  search: ListingSearch;
  onChange: (patch: SearchPatch) => void;
}) {
  return (
    <div className="flex flex-col divide-y divide-line">
      <Group title="Rent per room">
        <RentSlider value={search.max} onCommit={(max) => onChange({ max })} />
      </Group>

      <Group title="Bedrooms">
        <div className="flex flex-wrap gap-1.5">
          {[undefined, 1, 2, 3, 4, 5].map((n) => (
            <ToggleChip
              key={n ?? 'any'}
              pressed={search.beds === n}
              onClick={() => onChange({ beds: n })}
              className="min-w-11 justify-center"
            >
              {n === undefined ? 'Any' : `${n}+`}
            </ToggleChip>
          ))}
        </div>
      </Group>

      <Group title="Type of place">
        <div className="flex flex-wrap gap-1.5">
          {LISTING_TYPES.map((type) => (
            <ToggleChip
              key={type}
              pressed={Boolean(search.type?.includes(type))}
              onClick={() => onChange({ type: toggleIn(search.type, type) })}
            >
              {TYPE_LABELS[type]}
            </ToggleChip>
          ))}
        </div>
      </Group>

      <Group title="Walk to campus">
        <div className="flex flex-wrap gap-1.5">
          {[undefined, 10, 15, 20, 30].map((n) => (
            <ToggleChip key={n ?? 'any'} pressed={search.walk === n} onClick={() => onChange({ walk: n })}>
              {n === undefined ? 'Any' : `${n} min or less`}
            </ToggleChip>
          ))}
        </div>
      </Group>

      <Group title="Must have">
        <div className="flex flex-col">
          <CheckRow
            label="Western Verified"
            hint="On Western’s Off-Campus Housing list"
            checked={Boolean(search.verified)}
            onChange={(on) => onChange({ verified: on || undefined })}
          />
          <CheckRow
            label="Furnished"
            checked={Boolean(search.furnished)}
            onChange={(on) => onChange({ furnished: on || undefined })}
          />
          <CheckRow
            label="Utilities included"
            checked={Boolean(search.utilities)}
            onChange={(on) => onChange({ utilities: on || undefined })}
          />
        </div>
      </Group>

      <Group title="Area">
        <div className="flex flex-col">
          {NEIGHBOURHOODS.map((n) => (
            <CheckRow
              key={n}
              label={n}
              checked={Boolean(search.area?.includes(n))}
              onChange={() => onChange({ area: toggleIn(search.area, n) })}
            />
          ))}
        </div>
      </Group>

      <Group title="Amenities">
        <div className="flex flex-wrap gap-1.5">
          {AMENITIES.map((a) => (
            <ToggleChip
              key={a}
              pressed={Boolean(search.amenities?.includes(a))}
              onClick={() => onChange({ amenities: toggleIn(search.amenities, a) })}
            >
              {AMENITY_LABELS[a]}
            </ToggleChip>
          ))}
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="py-5 first:pt-0">
      <legend className="float-left mb-3 w-full text-[0.9375rem]">{title}</legend>
      <div className="clear-left">{children}</div>
    </fieldset>
  );
}

/** A checkbox row: the whole row is the hit area. */
function CheckRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="group flex min-h-11 items-center gap-3 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-md transition-[background-color,box-shadow,transform] duration-150 ease-out group-active:scale-90',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-purple',
          checked ? 'bg-ink text-paper' : 'bg-white inset-ring-[1.5px] inset-ring-ink-faint group-hover:inset-ring-ink',
        )}
      >
        <Tick visible={checked} />
      </span>
      <span className="text-[0.9375rem] leading-tight">
        {label}
        {hint && <span className="block font-text text-xs text-ink-faint">{hint}</span>}
      </span>
    </label>
  );
}

function Tick({ visible }: { visible: boolean }) {
  return (
    <CheckIcon
      size={14}
      strokeWidth={3}
      className={cn(
        'transition-[opacity,transform] duration-150 ease-out',
        visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
      )}
    />
  );
}

/** Max rent. Moves freely while you drag; the URL updates when you let go (or after a pause). */
function RentSlider({ value, onCommit }: { value?: number; onCommit: (max?: number) => void }) {
  const [draft, setDraft] = useState(value ?? RENT_MAX);
  useEffect(() => setDraft(value ?? RENT_MAX), [value]);

  useEffect(() => {
    const current = value ?? RENT_MAX;
    if (draft === current) return;
    const timer = setTimeout(() => onCommit(draft >= RENT_MAX ? undefined : draft), 250);
    return () => clearTimeout(timer);
  }, [draft, value, onCommit]);

  const fill = ((draft - RENT_MIN) / (RENT_MAX - RENT_MIN)) * 100;

  return (
    <div>
      <p className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-2xl tabular-nums tracking-normal">
          {draft >= RENT_MAX ? 'Any price' : `Up to ${formatPrice(draft)}`}
        </span>
        <span className="font-text text-xs text-ink-faint">per month</span>
      </p>
      <input
        type="range"
        aria-label="Maximum rent per room"
        aria-valuetext={draft >= RENT_MAX ? 'Any price' : `Up to ${formatPrice(draft)} a month`}
        min={RENT_MIN}
        max={RENT_MAX}
        step={RENT_STEP}
        value={draft}
        onChange={(e) => setDraft(Number(e.target.value))}
        className="range"
        style={{ '--fill': `${fill}%` } as CSSProperties}
      />
      <p className="mt-1 flex justify-between font-text text-xs text-ink-faint tabular-nums">
        <span>{formatPrice(RENT_MIN)}</span>
        <span>{formatPrice(RENT_MAX)}+</span>
      </p>
    </div>
  );
}
