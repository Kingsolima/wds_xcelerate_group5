import { Check, DoorClosed } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useKnocks } from '@/lib/store';
import { buttonStyles, type ButtonSize } from './Button';

/**
 * "Knock" is how you show interest in a place or a roommate post. The other side sees your
 * profile and can knock back; then you can message (once accounts exist).
 */
export function KnockButton({
  id,
  name,
  size = 'md',
  className,
}: {
  id: string;
  /** What is being knocked on, for screen readers. */
  name: string;
  size?: ButtonSize;
  className?: string;
}) {
  const knocks = useKnocks();
  const knocked = knocks.has(id);

  return (
    <button
      type="button"
      aria-pressed={knocked}
      aria-label={knocked ? `Knocked on ${name}. Undo` : `Knock on ${name}`}
      onClick={() => knocks.toggle(id)}
      className={buttonStyles({
        color: knocked ? 'outline' : 'ink',
        size,
        className: cn('group/knock', className),
      })}
    >
      <span
        key={String(knocked)}
        className={cn('inline-flex', knocked && 'animate-pop motion-reduce:animate-none')}
      >
        {knocked ? <Check size={17} aria-hidden="true" /> : <DoorClosed size={17} aria-hidden="true" className="group-hover/knock:animate-[knock_420ms_var(--ease-out)] motion-reduce:animate-none" />}
      </span>
      {knocked ? 'Knocked' : 'Knock'}
    </button>
  );
}
