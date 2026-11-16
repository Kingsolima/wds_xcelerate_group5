const price = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
});

/** 725 -> "$725" */
export function formatPrice(amount: number) {
  return price.format(amount);
}

// Dates in the data are plain "YYYY-MM-DD". Parse them as local dates so May 1 stays May 1.
function parseDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const monthDay = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' });
const monthDayYear = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const monthYear = new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric' });

/** "2027-05-01" -> "May 1, 2027" */
export function formatDate(iso: string) {
  return monthDayYear.format(parseDate(iso));
}

/** "2027-05-01" -> "May 2027" */
export function formatMonth(iso: string) {
  return monthYear.format(parseDate(iso));
}

/** ("2027-05-01", "2027-08-31") -> "May 1 – Aug 31, 2027" */
export function formatDateRange(from: string, to?: string) {
  if (!to) return `From ${formatDate(from)}`;
  const a = parseDate(from);
  const b = parseDate(to);
  const first = a.getFullYear() === b.getFullYear() ? monthDay.format(a) : monthDayYear.format(a);
  return `${first} – ${monthDayYear.format(b)}`;
}

/** (3, "bed") -> "3 beds" */
export function plural(count: number, word: string, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

const relative = new Intl.RelativeTimeFormat('en-CA', { numeric: 'auto' });

/** An ISO timestamp -> "3 days ago" */
export function timeAgo(iso: string, now = Date.now()) {
  const days = Math.round((new Date(iso).getTime() - now) / 86_400_000);
  if (Math.abs(days) < 1) return 'today';
  if (Math.abs(days) < 30) return relative.format(days, 'day');
  if (Math.abs(days) < 365) return relative.format(Math.round(days / 30), 'month');
  return relative.format(Math.round(days / 365), 'year');
}

/** "Aaliyah Rahman" -> "AR" */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
