import { DOORS, ROOMS, SCREEN, WALLS, WINDOWS, WINDOW_Y, type RoomId, type Tint } from './suite/plan';

const TINTS: Record<Tint, string> = {
  lavender: 'var(--color-lavender)',
  mint: 'var(--color-mint)',
  peach: 'var(--color-peach)',
  butter: 'var(--color-butter)',
  sky: 'var(--color-sky)',
};

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** Each door as an architect draws it: the leaf standing open and the arc it swings through. */
const doorPaths = DOORS.map((door) => {
  const [hx, hy] = door.hinge;
  const tip = (angle: number) => [hx + Math.cos(rad(angle)) * door.length, hy + Math.sin(rad(angle)) * door.length] as const;
  const [cx, cy] = tip(door.closed);
  const [ox, oy] = tip(door.open);
  const sweep = door.open > door.closed ? 1 : 0;
  return {
    id: door.id,
    d: `M${hx} ${hy}L${ox.toFixed(1)} ${oy.toFixed(1)}M${cx.toFixed(1)} ${cy.toFixed(1)}A${door.length} ${door.length} 0 0 ${sweep} ${ox.toFixed(1)} ${oy.toFixed(1)}`,
  };
});

/**
 * The Oxford as a flat plan, drawn from the same measurements the 3D model is built from. Used as
 * the small card in the hero and as the stand-in when WebGL is not available.
 */
export function PlanDrawing({ lit = [], className }: { lit?: readonly RoomId[]; className?: string }) {
  return (
    <svg viewBox="62 -7 684 789" className={className} aria-hidden="true" focusable="false">
      {ROOMS.map((room) =>
        room.rects.map(([x0, y0, x1, y1], i) => (
          <rect
            key={`${room.id}-${i}`}
            x={x0}
            y={y0}
            width={x1 - x0}
            height={y1 - y0}
            fill={TINTS[room.tint]}
            opacity={lit.includes(room.id) ? 1 : 0}
            style={{ transition: 'opacity 240ms ease' }}
          />
        )),
      )}
      <g fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.45">
        {doorPaths.map((door) => (
          <path key={door.id} d={door.d} />
        ))}
      </g>
      <g stroke="currentColor" strokeWidth="4">
        {WINDOWS.map((win) => (
          <line key={win.x0} x1={win.x0} x2={win.x1} y1={WINDOW_Y} y2={WINDOW_Y} />
        ))}
        <line x1={SCREEN.x0} x2={SCREEN.x1} y1={SCREEN.y} y2={SCREEN.y} />
      </g>
      <g fill="currentColor">
        {WALLS.map(({ r: [x0, y0, x1, y1] }, i) => (
          <rect key={i} x={x0} y={y0} width={x1 - x0} height={y1 - y0} />
        ))}
      </g>
    </svg>
  );
}
