import { useEffect, useRef } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Heart, Menu, Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSaved } from '@/lib/store';
import { buttonStyles } from './Button';
import { Logo } from './Logo';

const LINKS = [
  { to: '/listings', label: 'Listings', search: {} },
  { to: '/listings', label: 'Sublets', search: { kind: 'sublet' as const } },
  { to: '/roommates', label: 'Roommates', search: {} },
  { to: '/reviews', label: 'Reviews', search: {} },
] as const;

export function SiteNav() {
  const location = useRouterState({ select: (s) => s.location });
  const onHome = location.pathname === '/';
  const saved = useSaved();
  const menuRef = useRef<HTMLDialogElement>(null);

  // Close the phone menu whenever the page changes.
  useEffect(() => {
    menuRef.current?.close();
  }, [location.href]);

  const isActive = (link: (typeof LINKS)[number]) => {
    if (location.pathname !== link.to && !location.pathname.startsWith(`${link.to}/`)) return false;
    if (link.to !== '/listings') return true;
    const kind = (location.search as { kind?: string }).kind;
    return 'kind' in link.search ? kind === 'sublet' : kind !== 'sublet';
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40',
        onHome ? 'on-dark bg-purple text-white' : 'border-b border-line bg-paper/95 text-ink backdrop-blur-sm',
      )}
    >
      <nav aria-label="Main" className="wrap flex h-16 items-center gap-6">
        <Link to="/" aria-label="Knock home" className="-ml-1 rounded-lg px-1 py-2">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.label}>
              <Link
                to={link.to}
                search={link.search}
                aria-current={isActive(link) ? 'page' : undefined}
                className={cn(
                  'relative inline-flex min-h-11 items-center rounded-lg px-3 text-[0.9375rem] transition-colors duration-150',
                  onHome ? 'text-white/80 hover:text-white' : 'text-ink-soft hover:text-ink',
                  // The current page gets a short bar under its label.
                  'after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-200 after:ease-out',
                  'aria-[current=page]:text-current aria-[current=page]:after:scale-x-100',
                  onHome ? 'aria-[current=page]:text-white' : 'aria-[current=page]:text-ink',
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/saved"
            aria-label={`Saved, ${saved.ids.length} ${saved.ids.length === 1 ? 'listing' : 'listings'}`}
            className={cn(
              'relative grid size-11 place-items-center rounded-full transition-colors duration-150',
              onHome ? 'hover:bg-white/10' : 'hover:bg-wash',
            )}
          >
            <Heart size={20} />
            {saved.ids.length > 0 && (
              <span
                key={saved.ids.length}
                className={cn(
                  'absolute top-1 right-0.5 grid h-4.5 min-w-4.5 animate-pop place-items-center rounded-full px-1 text-[0.6875rem] tabular-nums motion-reduce:animate-none',
                  onHome ? 'bg-white text-purple' : 'bg-purple text-white',
                )}
              >
                {saved.ids.length}
              </span>
            )}
          </Link>

          <Link
            to="/post"
            className={buttonStyles({
              color: onHome ? 'white' : 'purple',
              size: 'sm',
              className: 'hidden min-h-11 sm:inline-flex',
            })}
          >
            <Plus size={16} /> Post a listing
          </Link>

          <button
            type="button"
            aria-label="Open menu"
            aria-haspopup="dialog"
            onClick={() => menuRef.current?.showModal()}
            className={cn(
              'grid size-11 place-items-center rounded-full md:hidden',
              onHome ? 'hover:bg-white/10' : 'hover:bg-wash',
            )}
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      <dialog
        ref={menuRef}
        aria-label="Menu"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="sheet on-dark m-0 mt-auto h-dvh max-h-none w-full max-w-none bg-purple p-0 text-white"
      >
        <div className="wrap flex h-full flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex h-16 items-center justify-between">
            <Logo />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => menuRef.current?.close()}
              className="grid size-11 place-items-center rounded-full hover:bg-white/10"
            >
              <X size={22} />
            </button>
          </div>
          <ul className="mt-6 flex flex-col">
            {[...LINKS, { to: '/saved', label: 'Saved', search: {} }].map((link) => (
              <li key={link.label} className="border-b border-white/15">
                <Link
                  to={link.to}
                  search={link.search}
                  className="flex min-h-16 items-center font-display text-4xl uppercase"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/post" className={buttonStyles({ color: 'white', size: 'lg', className: 'mt-auto w-full' })}>
            <Plus size={18} /> Post a listing
          </Link>
        </div>
      </dialog>
    </header>
  );
}
