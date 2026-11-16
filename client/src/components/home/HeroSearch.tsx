import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { NEIGHBOURHOODS, type Neighbourhood } from '@/data/data';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { Button } from '../Button';

type Looking = 'lease' | 'sublet' | 'housemates';

const RENTS = [600, 700, 800, 1000, 1300];

const fieldStyles =
  'flex min-h-14 flex-col justify-center rounded-xl px-4 transition-colors duration-150 hover:bg-wash focus-within:bg-wash';
const selectStyles =
  'w-full appearance-none bg-transparent text-[0.9375rem] text-ink outline-none -mx-px';

/** The working search on the first screen. Leases and sublets go to listings; housemates to the board. */
export function HeroSearch({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const navigate = useNavigate();
  const [looking, setLooking] = useState<Looking>('lease');
  const [area, setArea] = useState<Neighbourhood | ''>('');
  const [max, setMax] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (looking === 'housemates') {
      navigate({
        to: '/roommates',
        search: { area: area || undefined, max: max ? Number(max) : undefined },
      });
      return;
    }
    navigate({
      to: '/listings',
      search: {
        kind: looking,
        area: area ? [area] : undefined,
        max: max ? Number(max) : undefined,
      },
    });
  }

  return (
    <form
      role="search"
      aria-label="Find housing"
      onSubmit={submit}
      style={style}
      className={cn(
        'grid grid-cols-2 gap-1 rounded-2xl bg-white p-1.5 text-ink shadow-pop',
        'md:grid-cols-[1.2fr_1.2fr_1fr_auto] md:items-center',
        className,
      )}
    >
      <label className={cn(fieldStyles, 'col-span-2 md:col-span-1')}>
        <span className="font-text text-xs text-ink-soft">Looking for</span>
        <select
          className={selectStyles}
          value={looking}
          onChange={(e) => setLooking(e.target.value as Looking)}
        >
          <option value="lease">A place to lease</option>
          <option value="sublet">A sublet</option>
          <option value="housemates">Housemates</option>
        </select>
      </label>
      <label className={fieldStyles}>
        <span className="font-text text-xs text-ink-soft">Area</span>
        <select
          className={selectStyles}
          value={area}
          onChange={(e) => setArea(e.target.value as Neighbourhood | '')}
        >
          <option value="">Anywhere</option>
          {NEIGHBOURHOODS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className={fieldStyles}>
        <span className="font-text text-xs text-ink-soft">Rent per room</span>
        <select className={selectStyles} value={max} onChange={(e) => setMax(e.target.value)}>
          <option value="">Any price</option>
          {RENTS.map((r) => (
            <option key={r} value={r}>
              Up to {formatPrice(r)}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="lg" className="col-span-2 min-h-14 md:col-span-1">
        <Search size={18} aria-hidden="true" /> {looking === 'housemates' ? 'Find housemates' : 'Find a place'}
      </Button>
    </form>
  );
}
