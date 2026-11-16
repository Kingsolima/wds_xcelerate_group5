import { useState, type ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { sized, srcSet } from '@/data/photos';

/**
 * An image that fills its frame, sized for the width it is shown at, with a calm placeholder
 * while it loads. The frame (the parent) sets the aspect ratio.
 */
export function Photo({
  src,
  width,
  height,
  className,
  alt = '',
  ...props
}: Omit<ComponentProps<'img'>, 'src' | 'width' | 'height'> & {
  src: string;
  /** About how wide it is on screen, in CSS pixels. */
  width: number;
  height?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={sized(src, width, height)}
      srcSet={srcSet(src, width, height)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={cn(
        'size-full bg-wash object-cover transition-opacity duration-300',
        loaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
      {...props}
    />
  );
}
