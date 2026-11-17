import { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import gsap from 'gsap';
import { Plus, X } from 'lucide-react';
import { buttonStyles } from '@/components/Button';
import { Logo } from '@/components/Logo';

const LINKS = [
  { to: '/listings', label: 'Listings', search: {} },
  { to: '/listings', label: 'Sublets', search: { kind: 'sublet' } },
  { to: '/roommates', label: 'Roommates', search: {} },
  { to: '/reviews', label: 'Reviews', search: {} },
  { to: '/saved', label: 'Saved', search: {} },
] as const;

/**
 * The site menu: a purple sheet that opens out of the menu button and fills the card. A native
 * <dialog>, so focus is held inside it and Escape closes it.
 */
export function LandingMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const panel = dialog.querySelector('.lp-menu-panel');
    const rows = dialog.querySelectorAll('[data-menu-rise]');
    // The sheet grows from where the menu button is: the top right corner of the card.
    const origin = 'calc(100% - 2.75rem) 2.75rem';

    if (open && !dialog.open) {
      dialog.showModal();
      if (reduced) return;
      gsap.killTweensOf([panel, rows]);
      gsap.fromTo(
        panel,
        { clipPath: `circle(0% at ${origin})` },
        { clipPath: `circle(150% at ${origin})`, duration: 0.85, ease: 'expo.inOut', clearProps: 'clipPath' },
      );
      gsap.fromTo(
        rows,
        { yPercent: 110 },
        { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.055, delay: 0.3 },
      );
    } else if (!open && dialog.open) {
      if (reduced) {
        dialog.close();
        return;
      }
      gsap.killTweensOf([panel, rows]);
      gsap.to(panel, {
        clipPath: `circle(0% at ${origin})`,
        duration: 0.5,
        ease: 'power3.inOut',
        onComplete: () => {
          dialog.close();
          gsap.set(panel, { clearProps: 'clipPath' });
        },
      });
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Menu"
      className="lp-menu on-dark"
      onCancel={(event) => {
        // Escape: run the closing animation, then close.
        event.preventDefault();
        onClose();
      }}
    >
      <div className="lp-menu-panel">
        <div className="lp-menu-bar">
          <Logo />
          <button type="button" aria-label="Close menu" onClick={onClose} className="lp-round">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <ul className="lp-menu-links">
          {LINKS.map((link, i) => (
            <li key={link.label}>
              <Link to={link.to} search={link.search} className="lp-menu-link">
                <span className="lp-mask">
                  <span data-menu-rise className="lp-menu-index">
                    0{i + 1}
                  </span>
                </span>
                <span className="lp-mask">
                  <span data-menu-rise className="lp-menu-word">
                    {link.label}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="lp-menu-foot">
          <Link to="/post" className={buttonStyles({ color: 'white', size: 'lg' })}>
            <Plus size={18} aria-hidden="true" /> Post a listing
          </Link>
          <p>Student housing for Western, with reviews from the students who lived there.</p>
        </div>
      </div>
    </dialog>
  );
}
