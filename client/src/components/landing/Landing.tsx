import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ArrowDown, ArrowRight, ArrowUp, BadgeCheck, Bus, ShoppingBasket } from 'lucide-react';
import { buttonStyles } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { formatPrice, plural } from '@/lib/format';
import { LandingMenu } from './LandingMenu';
import { PlanDrawing } from './PlanDrawing';
import { SuiteCanvas } from './SuiteCanvas';
import { CHAPTERS } from './suite/chapters';
import { BEDROOMS, ROOMS, type RoomId, type Tint } from './suite/plan';
import type { SuiteLayout, SuiteScene, SuiteView } from './suite/SuiteScene';
import './landing.css';

gsap.registerPlugin(ScrollTrigger, SplitText);
// Phone address bars resize the window as they hide; re-measuring on every one makes the page jump.
ScrollTrigger.config({ ignoreMobileResize: true });

export type LandingStats = {
  listings: number;
  sublets: number;
  /** Cheapest sublet, dollars a month. */
  subletFrom: number | null;
  /** When the next sublet is free, e.g. "May 1 – Aug 31, 2027". */
  subletWindow: string | null;
  reviews: number;
  /** Average of every review's four scores, out of 5. */
  scores: { label: string; value: number }[];
  /** Roommate posts with a room still open, and how many rooms that is. */
  groups: number;
  spots: number;
  verified: number;
  /** Minutes from Masonville: to campus by bus, to groceries on foot. */
  busMinutes: number;
  groceryMinutes: number;
};

const LAST = CHAPTERS.length - 1;

/** The two giant words behind the model, one pair per chapter. */
const GHOST: readonly (readonly [string, string])[] = [
  ['Knock', 'Knock'],
  ['01', 'Reviews'],
  ['02', 'Sublets'],
  ['03', 'Housemates'],
  ['04', 'Verified'],
];

const RAIL = ['Reviews', 'Sublets', 'Housemates', 'Verified'] as const;

const TINTS: Record<Tint, string> = {
  lavender: 'var(--color-lavender)',
  mint: 'var(--color-mint)',
  peach: 'var(--color-peach)',
  butter: 'var(--color-butter-hover)',
  sky: 'var(--color-sky)',
};

/** Labels a chapter pins to rooms, in place of what hovering would show. */
const CHAPTER_TAGS: Partial<Record<number, Partial<Record<RoomId, { title: string; note: string }>>>> = {
  2: { bed2: { title: 'Bedroom 2', note: 'Yours to sublet' } },
  3: {
    bed1: { title: 'Room 1', note: 'Taken' },
    bed2: { title: 'Room 2', note: 'Taken' },
    bed3: { title: 'Room 3', note: 'Open' },
    bed4: { title: 'Room 4', note: 'Taken' },
  },
};

/** What the flat plan lights up in each chapter, for when the 3D model cannot run. */
const CHAPTER_ROOMS: readonly (readonly RoomId[])[] = [[], ['living'], ['bed2'], BEDROOMS, ['foyer']];

/** Where the model sits in the card, by the card's size. */
function layoutFor(width: number, height: number): SuiteLayout {
  if (width < 720) return { fitW: 0.98, fitH: 0.46, cx: 0, cy: 0.145, shiftX: 0 };
  if (width < 1060 || width / height < 1.2) return { fitW: 0.92, fitH: 0.54, cx: 0, cy: 0.095, shiftX: 0 };
  return { fitW: 0.56, fitH: 0.75, cx: 0, cy: -0.04, shiftX: 0.13 };
}

export function Landing({ stats }: { stats: LandingStats }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SuiteScene | null>(null);
  const tagRefs = useRef(new Map<RoomId, HTMLElement>());
  const progress = useRef({ p: 0 });
  const activeRef = useRef(0);
  const shownRef = useRef(0);
  const transition = useRef<((from: number, to: number) => void) | null>(null);

  const [active, setActive] = useState(0);
  const [view, setView] = useState<SuiteView>('iso');
  const [hovered, setHovered] = useState<RoomId | null>(null);
  const [focused, setFocused] = useState<RoomId | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // The frame around the card is dark, so the page behind it has to be too.
  useEffect(() => {
    const html = document.documentElement;
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const before = theme?.content;
    html.classList.add('lp-root');
    if (theme) theme.content = '#1b1425';
    return () => {
      html.classList.remove('lp-root');
      if (theme && before) theme.content = before;
    };
  }, []);

  const goTo = useCallback((index: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const top = stage.getBoundingClientRect().top + window.scrollY;
    const span = stage.offsetHeight - window.innerHeight;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: top + (span * index) / LAST, behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  // Everything GSAP owns: the scroll link, the opening sequence, and the swap between chapters.
  useLayoutEffect(() => {
    const root = rootRef.current!;
    const stage = stageRef.current!;
    const card = cardRef.current!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const d = (seconds: number) => (reduced ? 0 : seconds);
    const lines = new Map<Element, Element[]>();
    const splits: SplitText[] = [];
    let started = false;
    let dead = false;
    let fontTimer = 0;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const left = q('.lp-left .lp-slide') as HTMLElement[];
      const right = q('.lp-right .lp-slide') as HTMLElement[];
      const rows = q('.lp-ghost-row') as HTMLElement[];
      const viewToggle = q('.lp-view');
      const running: gsap.core.Timeline[] = [];

      /** Sizes a ghost word so it runs the width of the card, without growing taller than its share. */
      const fitGhost = (row: HTMLElement, share: number) => {
        const word = row.firstElementChild as HTMLElement;
        row.style.fontSize = '100px';
        const perPx = word.getBoundingClientRect().width / 100;
        if (!perPx) return;
        const size = Math.min((card.clientWidth * 0.955) / perPx, (card.clientHeight * share) / 0.72);
        row.style.fontSize = `${size.toFixed(1)}px`;
      };
      const fitAll = () => {
        fitGhost(rows[0]!, 0.44);
        fitGhost(rows[1]!, 0.38);
      };

      /** Brings a slide in: its heading line by line, then everything under it. */
      const reveal = (slide: HTMLElement) => {
        const tl = gsap.timeline();
        tl.set(slide, { autoAlpha: 1, y: 0 });
        const heading = slide.querySelector('[data-split]');
        const split = heading ? lines.get(heading) : undefined;
        if (split?.length) {
          tl.fromTo(split, { yPercent: 118 }, { yPercent: 0, duration: d(1), stagger: d(0.09), ease: 'expo.out' }, 0);
        }
        const rest = slide.querySelectorAll('[data-rise]');
        if (rest.length) {
          tl.fromTo(
            rest,
            { y: 16, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: d(0.85), stagger: d(0.07), ease: 'expo.out' },
            d(0.12),
          );
        }
        const bars = slide.querySelectorAll('[data-bar]');
        if (bars.length) {
          tl.fromTo(bars, { scaleX: 0 }, { scaleX: 1, duration: d(1.1), stagger: d(0.08), ease: 'expo.out' }, d(0.3));
        }
        const strokes = slide.querySelectorAll('[data-draw]');
        if (strokes.length) {
          tl.fromTo(
            strokes,
            { strokeDashoffset: 1 },
            { strokeDashoffset: 0, duration: d(1.3), stagger: d(0.5), ease: 'power2.inOut' },
            d(0.35),
          );
        }
        return tl;
      };

      const swap = (stack: HTMLElement[], from: number, to: number) => {
        stack.forEach((slide, i) => {
          if (i !== from && i !== to) gsap.set(slide, { autoAlpha: 0 });
        });
        const tl = gsap.timeline();
        if (stack[from]) tl.to(stack[from], { autoAlpha: 0, y: -12, duration: d(0.26), ease: 'power2.in' });
        if (stack[to]) tl.add(reveal(stack[to]));
        return tl;
      };

      const swapGhost = (row: HTMLElement, word: string, share: number, delay: number) => {
        const span = row.firstElementChild as HTMLElement;
        return gsap
          .timeline({ delay: d(delay) })
          .to(span, { yPercent: -106, duration: d(0.5), ease: 'power3.in' })
          .add(() => {
            span.textContent = word;
            fitGhost(row, share);
          })
          .fromTo(span, { yPercent: 106 }, { yPercent: 0, duration: d(1.2), ease: 'expo.out' });
      };

      const settle = (index: number) => {
        gsap.to(viewToggle, { autoAlpha: index === 0 ? 1 : 0, duration: d(0.4), overwrite: true });
      };

      transition.current = (from, to) => {
        if (!started) return;
        // Run inside the context so these animations are cleaned up with the rest.
        ctx.add(() => {
          running.splice(0).forEach((tl) => tl.kill());
          running.push(
            swap(left, from, to),
            swap(right, from, to),
            swapGhost(rows[0]!, GHOST[to]![0], 0.44, 0),
            swapGhost(rows[1]!, GHOST[to]![1], 0.38, 0.08),
          );
          settle(to);
        });
      };

      // Scroll position drives the camera, lightly smoothed. Chapters change when it is halfway.
      gsap.to(progress.current, {
        p: LAST,
        ease: 'none',
        scrollTrigger: { trigger: stage, start: 'top top', end: 'bottom bottom', scrub: reduced ? true : 0.7 },
        onUpdate: () => {
          const p = progress.current.p;
          sceneRef.current?.setProgress(p);
          const index = Math.round(p);
          if (index !== activeRef.current) {
            activeRef.current = index;
            setActive(index);
          }
        },
      });

      const begin = () => {
        if (started || dead) return;
        started = true;
        ctx.add(() => open());
      };

      const open = () => {
        for (const heading of q('[data-split]')) {
          splits.push(
            SplitText.create(heading, {
              type: 'lines',
              mask: 'lines',
              linesClass: 'lp-line',
              autoSplit: true,
              onSplit: (self) => {
                lines.set(heading, self.lines);
              },
            }),
          );
        }
        const now = activeRef.current;
        rows.forEach((row, i) => {
          (row.firstElementChild as HTMLElement).textContent = GHOST[now]![i]!;
        });
        fitAll();
        card.dataset.state = 'in';
        settle(now);

        const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
        intro
          .from(q('.lp-ghost-row span'), { yPercent: 106, duration: d(1.5), stagger: d(0.14) }, d(0.05))
          .from(q('.lp-header > *'), { y: -14, autoAlpha: 0, duration: d(0.9), stagger: d(0.07) }, d(0.3))
          .add(reveal(left[now]!), d(0.5))
          .add(reveal(right[now]!), d(0.75))
          .from(q('.lp-rail, .lp-cue'), { y: 10, autoAlpha: 0, duration: d(0.8), stagger: d(0.08) }, d(1));
        running.push(intro);
      };

      // Headings are split into lines, and line breaks depend on the font: wait for it, briefly.
      document.fonts.ready.then(begin);
      fontTimer = window.setTimeout(begin, 1200);

      const observer = new ResizeObserver(() => {
        sceneRef.current?.setLayout(layoutFor(card.clientWidth, card.clientHeight));
        if (started) fitAll();
      });
      observer.observe(card);
      return () => observer.disconnect();
    }, root);

    return () => {
      dead = true;
      window.clearTimeout(fontTimer);
      transition.current = null;
      splits.forEach((split) => split.revert());
      ctx.revert();
      card.dataset.state = 'loading';
    };
  }, []);

  // Whenever the model fills the card (a chapter, or a room brought up close) it is faded out from
  // under the copy, header and rail. See .lp-canvas in the CSS.
  const crowded = active !== 0 || focused !== null;
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tween = gsap.to(cardRef.current, {
      '--fade': crowded ? 1 : 0,
      duration: reduced ? 0 : 0.8,
      ease: 'power2.out',
    });
    return () => {
      tween.kill();
    };
  }, [crowded]);

  // A new chapter: tell the model, and swap the words around it.
  useEffect(() => {
    const from = shownRef.current;
    shownRef.current = active;
    sceneRef.current?.setChapter(CHAPTERS[active]!);
    if (from !== active) transition.current?.(from, active);
  }, [active]);

  const handleScene = useCallback((scene: SuiteScene | null) => {
    sceneRef.current = scene;
    if (!scene) {
      setReady(false);
      return;
    }
    const card = cardRef.current;
    if (card) scene.setLayout(layoutFor(card.clientWidth, card.clientHeight));
    scene.setAnchors(tagRefs.current);
    scene.setProgress(progress.current.p);
    scene.setChapter(CHAPTERS[activeRef.current]!);
    setReady(true);
    scene.playIntro();
  }, []);

  const chooseView = (next: SuiteView) => sceneRef.current?.setView(next);
  const nextLabel = active < LAST ? `Next: ${RAIL[active]}` : 'Back to the top';
  const lit = focused ? [focused] : hovered ? [hovered] : CHAPTER_ROOMS[active]!;

  return (
    <div ref={rootRef} className="lp">
      <div ref={stageRef} className="lp-stage" style={{ '--chapters': CHAPTERS.length } as CSSProperties}>
        <div className="lp-sticky">
          <div ref={cardRef} className="lp-card" data-state="loading">
            <div className="lp-ghost" aria-hidden="true">
              <div className="lp-ghost-row lp-ghost-row--a">
                <span>{GHOST[0]![0]}</span>
              </div>
              <div className="lp-ghost-row lp-ghost-row--b">
                <span>{GHOST[0]![1]}</span>
              </div>
            </div>

            {failed ? (
              <div className="lp-fallback">
                <PlanDrawing lit={lit} />
              </div>
            ) : (
              <SuiteCanvas
                ready={ready}
                onScene={handleScene}
                onFail={() => setFailed(true)}
                onHover={setHovered}
                onFocus={setFocused}
                onView={setView}
              />
            )}

            <div className="lp-tags" aria-hidden="true">
              {ROOMS.map((room) => {
                const pinned = CHAPTER_TAGS[active]?.[room.id];
                const on = pinned ? true : focused ? focused === room.id : hovered === room.id;
                return (
                  <div
                    key={room.id}
                    className="lp-tag"
                    data-on={on}
                    data-pinned={pinned ? true : undefined}
                    ref={(element) => {
                      if (element) tagRefs.current.set(room.id, element);
                      else tagRefs.current.delete(room.id);
                    }}
                  >
                    <div className="lp-tag-body">
                      <i style={{ background: TINTS[room.tint] }} />
                      <b>{pinned?.title ?? room.name}</b>
                      <span>{pinned?.note ?? room.note}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <header className="lp-header">
              <Link to="/" aria-label={`${BRAND.name} home`} className="lp-logo" onClick={() => goTo(0)}>
                <Logo />
              </Link>

              <div className="lp-title">
                <p>
                  The Oxford <span>Masonville Yards</span>
                </p>
                {!failed && (
                  <div className="lp-view" role="group" aria-label="View">
                    {(
                      [
                        ['iso', 'Isometric'],
                        ['plan', 'Plan'],
                      ] as const
                    ).map(([id, label]) => (
                      <button key={id} type="button" aria-pressed={view === id} onClick={() => chooseView(id)}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="lp-burger"
                aria-label="Open menu"
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
              >
                <span aria-hidden="true">
                  <i />
                  <i />
                </span>
              </button>
            </header>

            {/* ---------- Left: what the product is, then one chapter at a time ---------- */}
            <div className="lp-left">
              <div className="lp-slide">
                {!failed && (
                  <button
                    type="button"
                    data-rise
                    className="lp-plancard"
                    aria-pressed={view === 'plan'}
                    aria-label="See the floor plan from above"
                    onClick={() => chooseView(view === 'plan' ? 'iso' : 'plan')}
                  >
                    <PlanDrawing lit={lit} />
                  </button>
                )}
                <h1 data-split className="lp-h1">
                  Look inside before you sign
                </h1>
                <p data-rise className="lp-lede">
                  {BRAND.name} is student housing for {BRAND.school}: leases, sublets and housemates, with reviews
                  from the students who lived there.
                </p>
                <p data-rise className="lp-fact">
                  <i aria-hidden="true" />
                  {plural(stats.listings, 'place')} open for 2027, {stats.sublets} of them sublets
                </p>
                <div data-rise className="lp-actions">
                  <Link to="/listings" className={buttonStyles({ color: 'purple' })}>
                    Find a place <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link to="/post" search={{ type: 'sublet' }} className={buttonStyles({ color: 'outline' })}>
                    Sublet your room
                  </Link>
                </div>
              </div>

              <Chapter number="01" label="Reviews" title="Reviews from the last tenants">
                <p data-rise className="lp-lede">
                  Every place is scored on landlord, condition, value and quiet by a student who lived there.
                  Landlords can reply, but they can’t take a review down.
                </p>
                <div data-rise className="lp-actions">
                  <Link to="/reviews" className={buttonStyles({ color: 'purple' })}>
                    Read all {stats.reviews} reviews <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </Chapter>

              <Chapter number="02" label="Sublets" title="Sublet your room for a co-op term">
                <p data-rise className="lp-lede">
                  Away for an internship or the summer? Post your room with its dates and rent, and stop paying
                  for a bed you aren’t sleeping in.
                </p>
                <div data-rise className="lp-actions">
                  <Link to="/post" search={{ type: 'sublet' }} className={buttonStyles({ color: 'purple' })}>
                    Sublet your room <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link to="/listings" search={{ kind: 'sublet' }} className={buttonStyles({ color: 'outline' })}>
                    See {stats.sublets} sublets
                  </Link>
                </div>
              </Chapter>

              <Chapter number="03" label="Housemates" title="Housemates for the other rooms">
                <p data-rise className="lp-lede">
                  Browse houses that need one more, or post your own. Knock on a post to show you’re interested;
                  if they knock back, you can message each other.
                </p>
                <div data-rise className="lp-actions">
                  <Link to="/roommates" className={buttonStyles({ color: 'purple' })}>
                    Find housemates <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link to="/post" search={{ type: 'roommate' }} className={buttonStyles({ color: 'outline' })}>
                    Post an ad
                  </Link>
                </div>
              </Chapter>

              <Chapter number="04" label="Verified" title="Checked against Western’s list">
                <p data-rise className="lp-lede">
                  Landlords post with photos, rent and lease dates. A place that is also on Western’s Off-Campus
                  Housing list gets the Western Verified badge.
                </p>
                <div data-rise className="lp-actions">
                  <Link to="/listings" search={{ verified: true }} className={buttonStyles({ color: 'purple' })}>
                    See verified places <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link to="/post" search={{ type: 'listing' }} className={buttonStyles({ color: 'outline' })}>
                    List a property
                  </Link>
                </div>
              </Chapter>
            </div>

            {/* ---------- Right: a note on the model, then the numbers behind each chapter ---------- */}
            <div className="lp-right">
              <div className="lp-slide">
                <svg className="lp-sign" viewBox="0 0 210 96" aria-hidden="true" focusable="false">
                  <path
                    data-draw
                    pathLength={1}
                    d="M20 78C24 52 33 26 44 10c5-7 9-2 6 9-5 19-14 40-19 62M66 14C54 32 44 42 32 50c14-3 24 8 30 24 5 12 15 9 21-3 5-10 11-12 13-2 2 9 8 9 13-2 4-9 10-9 12 0 2 8 9 8 15-3 12-22 17-42 12-44-6-2-12 22-11 40 1 12 9 13 17 2"
                  />
                  <path data-draw pathLength={1} d="M14 90c52-11 112-15 186-22" />
                </svg>
                <p data-rise className="lp-note">
                  The Oxford at Masonville Yards, on Richmond Street. Four students, three baths, and{' '}
                  {stats.busMinutes} minutes to campus by bus. Drag it round, or pick a room.
                </p>
              </div>

              <div className="lp-slide">
                <div data-rise className="lp-frag">
                  <p className="lp-frag-title">Average across {stats.reviews} reviews</p>
                  <ul className="lp-scores">
                    {stats.scores.map((score) => (
                      <li key={score.label}>
                        <span>{score.label}</span>
                        <span className="lp-bar">
                          <i data-bar style={{ width: `${(score.value / 5) * 100}%` }} />
                        </span>
                        <b>{score.value.toFixed(1)}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="lp-slide">
                <div data-rise className="lp-frag">
                  <p className="lp-big">{stats.sublets}</p>
                  <p className="lp-frag-title">sublets open now</p>
                  <dl className="lp-rows">
                    {stats.subletFrom !== null && (
                      <div>
                        <dt>From</dt>
                        <dd>{formatPrice(stats.subletFrom)} a month</dd>
                      </div>
                    )}
                    {stats.subletWindow && (
                      <div>
                        <dt>Soonest</dt>
                        <dd>{stats.subletWindow}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <div className="lp-slide">
                <div data-rise className="lp-frag">
                  <p className="lp-big">{stats.spots}</p>
                  <p className="lp-frag-title">
                    {stats.spots === 1 ? 'room' : 'rooms'} open across {plural(stats.groups, 'post')}
                  </p>
                  <ul className="lp-seats" aria-hidden="true">
                    {(['lavender', 'mint', 'peach', 'sky'] as const).map((tint, i) => (
                      <li key={tint} data-open={i === 2} style={{ background: TINTS[tint] }} />
                    ))}
                  </ul>
                </div>
              </div>

              <div className="lp-slide">
                <div data-rise className="lp-frag">
                  <p className="lp-badge">
                    <BadgeCheck size={20} aria-hidden="true" /> Western Verified
                  </p>
                  <p className="lp-frag-title">
                    {stats.verified} of {stats.listings} listings carry it
                  </p>
                  <ul className="lp-chips">
                    <li>
                      <Bus size={15} aria-hidden="true" /> {stats.busMinutes} min to campus
                    </li>
                    <li>
                      <ShoppingBasket size={15} aria-hidden="true" /> {stats.groceryMinutes} min to groceries
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {focused && (
              <button type="button" className="lp-reset" onClick={() => sceneRef.current?.focusRoom(null)}>
                Show the whole suite
              </button>
            )}

            <nav className="lp-rail" aria-label="On this page">
              {RAIL.map((label, i) => (
                <button key={label} type="button" aria-current={active === i + 1 ? 'step' : undefined} onClick={() => goTo(i + 1)}>
                  <span>0{i + 1}</span>
                  <b>{label}</b>
                </button>
              ))}
            </nav>

            <button
              type="button"
              className="lp-cue lp-round"
              aria-label={nextLabel}
              onClick={() => goTo(active < LAST ? active + 1 : 0)}
            >
              {active < LAST ? <ArrowDown size={18} aria-hidden="true" /> : <ArrowUp size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      <LandingMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

function Chapter({
  number,
  label,
  title,
  children,
}: {
  number: string;
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="lp-slide">
      <p data-rise className="lp-kicker">
        <span>{number}</span> {label}
      </p>
      <h2 data-split className="lp-h1">
        {title}
      </h2>
      {children}
    </div>
  );
}
