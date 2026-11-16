import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

const WORDS = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Great'];

/** Five radio buttons drawn as stars, with a hover preview. Arrow keys work like any radio group. */
export function StarInput({
  name,
  label,
  value,
  onChange,
  size = 28,
  invalid,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  size?: number;
  invalid?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset aria-invalid={invalid}>
      <legend className="mb-1.5 text-sm">{label}</legend>
      <div className="flex items-center gap-3">
        <div className="flex" onPointerLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="group relative grid size-11 place-items-center" onPointerEnter={() => setHover(n)}>
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer sr-only"
                aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
              />
              <Star
                size={size}
                strokeWidth={1.5}
                aria-hidden="true"
                className={cn(
                  'rounded transition-[color,fill,transform] duration-150 ease-out group-active:scale-90',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-purple',
                  n <= shown ? 'fill-purple text-purple' : 'fill-transparent text-ink-faint',
                )}
              />
            </label>
          ))}
        </div>
        <span className="w-16 font-text text-sm text-ink-soft" aria-hidden="true">
          {WORDS[shown]}
        </span>
      </div>
    </fieldset>
  );
}
