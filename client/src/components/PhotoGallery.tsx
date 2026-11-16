import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Grid2x2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { sized, srcSet } from '@/data/photos';
import { Photo } from './Photo';

/** One big photo and four small ones; any of them opens the full set. */
export function PhotoGallery({ name, photos }: { name: string; photos: string[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const unique = [...new Set(photos)];
  const shown = unique.slice(0, 5);

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const step = (by: number) => setIndex((i) => (i + by + unique.length) % unique.length);

  return (
    <>
      <div className="relative">
        <div className="grid h-[17rem] grid-cols-1 gap-2 overflow-hidden rounded-3xl sm:h-[22rem] md:grid-cols-4 md:grid-rows-2 lg:h-[30rem]">
          {shown.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => open(i)}
              aria-label={`Open photo ${i + 1} of ${unique.length}`}
              className={cn(
                'group relative overflow-hidden bg-wash focus-visible:outline-offset-[-4px] focus-visible:outline-white',
                i === 0 ? 'md:col-span-2 md:row-span-2' : 'hidden md:block',
              )}
            >
              <Photo
                src={src}
                width={i === 0 ? 760 : 380}
                height={i === 0 ? 600 : 300}
                loading={i === 0 ? 'eager' : 'lazy'}
                alt={i === 0 ? name : ''}
                className="transition-[transform,opacity,filter] duration-500 ease-out group-hover:scale-[1.03] group-hover:brightness-95 motion-reduce:group-hover:scale-100"
              />
            </button>
          ))}
          {Array.from({ length: Math.max(0, 5 - shown.length) }, (_, i) => (
            <div key={`empty-${i}`} className="hidden bg-wash md:block" />
          ))}
        </div>
        <button
          type="button"
          onClick={() => open(0)}
          className="absolute right-3 bottom-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-sm shadow-card transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <Grid2x2 size={16} aria-hidden="true" /> Show all {unique.length} photos
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`Photos of ${name}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="modal on-dark m-auto h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-white backdrop:bg-ink/90"
      >
        <Lightbox
          photos={unique}
          index={index}
          onStep={step}
          onClose={() => dialogRef.current?.close()}
          name={name}
        />
      </dialog>
    </>
  );
}

function Lightbox({
  photos,
  index,
  onStep,
  onClose,
  name,
}: {
  photos: string[];
  index: number;
  onStep: (by: number) => void;
  onClose: () => void;
  name: string;
}) {
  const src = photos[index]!;
  // Swap instantly when stepping with keys: no animation on a keyboard action.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [src]);

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm tabular-nums" aria-live="polite">
          {index + 1} / {photos.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photos"
          autoFocus
          className="grid size-11 place-items-center rounded-full hover:bg-white/10"
        >
          <X size={22} />
        </button>
      </div>
      <div className="relative flex min-h-0 items-center justify-center px-4 md:px-20" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img
          key={src}
          src={sized(src, 1400)}
          srcSet={srcSet(src, 1400)}
          alt={`${name}, photo ${index + 1}`}
          onLoad={() => setLoaded(true)}
          className={cn('max-h-full max-w-full rounded-xl object-contain', !loaded && 'opacity-0')}
        />
        {photos.length > 1 && (
          <>
            <NavButton side="left" onClick={() => onStep(-1)} />
            <NavButton side="right" onClick={() => onStep(1)} />
          </>
        )}
      </div>
      <div className="flex justify-center gap-2 overflow-x-auto px-4 py-4">
        {photos.map((p, i) => (
          <span
            key={p}
            aria-hidden="true"
            className={cn('h-1.5 w-6 rounded-full transition-colors duration-200', i === index ? 'bg-white' : 'bg-white/25')}
          />
        ))}
      </div>
    </div>
  );
}

function NavButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      className={cn(
        'absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-pop transition-transform duration-150 ease-out active:scale-95',
        side === 'left' ? 'left-3 md:left-6' : 'right-3 md:right-6',
      )}
    >
      <Icon size={22} />
    </button>
  );
}
