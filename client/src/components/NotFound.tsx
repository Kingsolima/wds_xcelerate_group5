import { Link } from '@tanstack/react-router';
import { buttonStyles } from './Button';

export function NotFound({
  title = 'Nobody’s home',
  body = 'This page doesn’t exist, or the listing was taken down.',
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="wrap grid min-h-[70svh] place-items-center py-20 text-center">
      <div className="flex flex-col items-center">
        <DoorShut />
        <h1 className="mt-8 font-display text-5xl uppercase md:text-6xl">{title}</h1>
        <p className="mt-3 max-w-md font-text text-ink-soft">{body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/listings" className={buttonStyles()}>
            See all listings
          </Link>
          <Link to="/" className={buttonStyles({ color: 'outline' })}>
            Go home
          </Link>
        </div>
      </div>
    </section>
  );
}

function DoorShut() {
  return (
    <svg viewBox="0 0 120 170" aria-hidden="true" className="h-36 w-auto">
      <rect x="4" y="4" width="112" height="162" rx="6" fill="var(--color-wash)" stroke="var(--color-line)" strokeWidth="3" />
      <rect x="18" y="16" width="84" height="150" rx="3" fill="var(--color-lavender)" />
      <rect x="30" y="30" width="60" height="44" rx="3" fill="none" stroke="var(--color-lavender-ink)" strokeOpacity=".25" strokeWidth="2" />
      <rect x="30" y="88" width="60" height="64" rx="3" fill="none" stroke="var(--color-lavender-ink)" strokeOpacity=".25" strokeWidth="2" />
      <circle cx="88" cy="90" r="5" fill="var(--color-lavender-ink)" />
    </svg>
  );
}
