import { Link } from '@tanstack/react-router';
import { BRAND } from '@/lib/brand';
import { Logo } from './Logo';

const COLUMNS = [
  {
    title: 'Find',
    links: [
      { to: '/listings', label: 'All listings', search: {} },
      { to: '/listings', label: 'Sublets', search: { kind: 'sublet' } },
      { to: '/roommates', label: 'Roommate posts', search: {} },
      { to: '/reviews', label: 'Reviews', search: {} },
    ],
  },
  {
    title: 'Post',
    links: [
      { to: '/post', label: 'Sublet your room', search: { type: 'sublet' } },
      { to: '/post', label: 'Find housemates', search: { type: 'roommate' } },
      { to: '/post', label: 'List a property', search: { type: 'listing' } },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="on-dark bg-purple-deep text-white">
      <div className="wrap grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 font-text text-sm leading-relaxed text-white/75">
            Houses, sublets and housemates near {BRAND.school}, with reviews from the students who
            lived there.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm text-white/60">{column.title}</h2>
            <ul className="mt-3 space-y-1">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    search={link.search}
                    className="inline-flex min-h-9 items-center underline decoration-white/0 underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="wrap flex flex-col gap-2 border-t border-white/15 py-6 font-text text-xs text-white/60 sm:flex-row sm:justify-between">
        <p>Prototype. Listings, reviews and people are demo data. Photographs via Unsplash.</p>
        <p>Not affiliated with Western University.</p>
      </div>
    </footer>
  );
}
