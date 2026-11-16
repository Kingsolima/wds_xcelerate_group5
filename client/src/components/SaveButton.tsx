import { Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSaved } from '@/lib/store';

type Props = {
  listingId: string;
  listingName: string;
  className?: string;
};

/** Heart toggle for a listing. Saved state lives in the shared store, so every page agrees. */
export function SaveButton({ listingId, listingName, className }: Props) {
  const saved = useSaved();
  const isSaved = saved.has(listingId);

  return (
    <button
      type="button"
      aria-label={isSaved ? `Remove ${listingName} from saved` : `Save ${listingName}`}
      aria-pressed={isSaved}
      onClick={(e) => {
        // The button usually sits on top of a card link.
        e.preventDefault();
        e.stopPropagation();
        saved.toggle(listingId);
      }}
      className={cn(
        'grid size-11 place-items-center rounded-full bg-white/95 text-ink shadow-card',
        'transition-transform duration-150 ease-out hover:scale-105 active:scale-95',
        className,
      )}
    >
      <Heart
        // Re-keying replays the pop only when the heart fills, not on first paint.
        key={String(isSaved)}
        size={18}
        strokeWidth={2}
        className={cn(isSaved && 'animate-pop fill-purple text-purple motion-reduce:animate-none')}
      />
    </button>
  );
}
