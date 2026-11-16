import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export type ButtonColor =
  | 'purple'
  | 'ink'
  | 'white'
  | 'outline'
  | 'ghost'
  | 'lavender'
  | 'mint'
  | 'peach'
  | 'butter'
  | 'sky';
export type ButtonSize = 'sm' | 'md' | 'lg';

const colors: Record<ButtonColor, string> = {
  purple: 'bg-purple text-white hover:bg-purple-deep',
  ink: 'bg-ink text-paper hover:bg-purple-deep',
  white: 'bg-white text-ink hover:bg-lavender',
  outline: 'bg-white text-ink inset-ring inset-ring-line hover:inset-ring-ink-faint',
  ghost: 'text-ink hover:bg-wash',
  lavender: 'bg-lavender text-lavender-ink hover:bg-lavender-hover',
  mint: 'bg-mint text-mint-ink hover:bg-mint-hover',
  peach: 'bg-peach text-peach-ink hover:bg-peach-hover',
  butter: 'bg-butter text-butter-ink hover:bg-butter-hover',
  sky: 'bg-sky text-sky-ink hover:bg-sky-hover',
};

// md and lg are at least 44px tall so they are comfortable to tap.
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 gap-1.5 rounded-lg px-3 text-sm',
  md: 'min-h-11 gap-2 rounded-xl px-5 text-base',
  lg: 'min-h-13 gap-2.5 rounded-xl px-6 text-lg',
};

/**
 * Class string for the button style. Use this directly to style
 * things that aren't <button>s, e.g. <Link className={buttonStyles()}>.
 */
export function buttonStyles({
  color = 'purple',
  size = 'md',
  className = '',
}: { color?: ButtonColor; size?: ButtonSize; className?: string } = {}) {
  return cn(
    'inline-flex items-center justify-center whitespace-nowrap font-normal select-none',
    // Step up a pixel on hover, press in on click. Only the properties that change are animated.
    'transition-[transform,background-color,color,box-shadow] duration-150 ease-out',
    'hover:-translate-y-px active:translate-y-0 active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-50',
    colors[color],
    sizes[size],
    className,
  );
}

type ButtonProps = Omit<ComponentProps<'button'>, 'color'> & {
  color?: ButtonColor;
  size?: ButtonSize;
};

export function Button({ color, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ color, size, className })} {...props} />;
}
