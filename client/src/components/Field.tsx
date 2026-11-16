import { useId, type ComponentProps, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export const controlStyles = cn(
  'w-full min-h-11 rounded-xl bg-white px-3.5 text-base text-ink',
  'inset-ring inset-ring-line placeholder:text-ink-faint',
  'transition-shadow duration-150 ease-out hover:inset-ring-ink-faint',
  'focus-visible:inset-ring-2 focus-visible:inset-ring-purple focus-visible:outline-none',
  'aria-invalid:inset-ring-2 aria-invalid:inset-ring-danger',
);

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  /** Render prop: receives the ids the control needs to be wired to its label and messages. */
  children: (control: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean;
  }) => ReactNode;
};

/** Label on top, control, then an error (or a hint) underneath its own field. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm text-ink">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': message ? messageId : undefined,
        'aria-invalid': Boolean(error),
      })}
      {message && (
        <p
          id={messageId}
          className={cn('font-text text-[0.8125rem]', error ? 'text-danger' : 'text-ink-faint')}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlStyles, className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlStyles, 'py-2.5 font-text', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block">
      <select className={cn(controlStyles, 'appearance-none pr-10', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-soft"
      />
    </span>
  );
}
