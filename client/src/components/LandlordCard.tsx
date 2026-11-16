import { Link } from '@tanstack/react-router';
import { ArrowRight, Building2, User } from 'lucide-react';
import type { LandlordSummary } from '@/data/api';
import { plural } from '@/lib/format';
import { Rating } from './Rating';

export function LandlordCard({ landlord }: { landlord: LandlordSummary }) {
  const Icon = landlord.kind === 'company' ? Building2 : User;
  return (
    <Link
      to="/landlords/$landlordId"
      params={{ landlordId: landlord.id }}
      className="group flex items-start gap-4 rounded-2xl bg-white p-5 shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sky text-sky-ink">
        <Icon size={22} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg leading-tight">{landlord.name}</span>
        <span className="mt-1 block font-text text-[0.8125rem] text-ink-soft">
          Renting to students since {landlord.since} · {plural(landlord.listingIds.length, 'listing')}
        </span>
        <Rating average={landlord.rating.average} count={landlord.rating.count} className="mt-2" />
      </span>
      <ArrowRight size={18} aria-hidden="true" className="mt-1 shrink-0 text-ink-soft transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
    </Link>
  );
}
