import { useEffect, useRef } from 'react';
import type { SuiteEvents, SuiteScene } from './suite/SuiteScene';

type Props = SuiteEvents & {
  /** Called with the scene once it exists, and with null when it is torn down. */
  onScene: (scene: SuiteScene | null) => void;
  /** WebGL would not start. The page falls back to the drawn plan. */
  onFail: () => void;
  ready: boolean;
};

/**
 * The canvas the suite is drawn on. three.js and the model are loaded here, on demand, so the
 * rest of the page paints without waiting for them.
 */
export function SuiteCanvas({ onScene, onFail, ready, ...events }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The scene outlives renders, so it calls through a ref to always reach the latest handlers.
  const handlers = useRef({ onScene, onFail, events });
  useEffect(() => {
    handlers.current = { onScene, onFail, events };
  });

  useEffect(() => {
    let scene: SuiteScene | null = null;
    let cancelled = false;
    import('./suite/SuiteScene')
      .then(({ SuiteScene }) => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        scene = new SuiteScene(canvas, {
          onHover: (room) => handlers.current.events.onHover?.(room),
          onFocus: (room) => handlers.current.events.onFocus?.(room),
          onView: (view) => handlers.current.events.onView?.(view),
          onDragStart: () => handlers.current.events.onDragStart?.(),
        });
        handlers.current.onScene(scene);
      })
      .catch((error) => {
        console.warn('The 3D suite could not start; showing the floor plan instead.', error);
        if (!cancelled) handlers.current.onFail();
      });
    return () => {
      cancelled = true;
      scene?.dispose();
      handlers.current.onScene(null);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="lp-canvas"
      data-ready={ready}
      role="img"
      aria-label="A model of the Oxford suite at Masonville Yards, seen from above: four bedrooms, three bathrooms, a kitchen, and a living and dining room. Drag to turn it, or click a room to look closer."
    />
  );
}
