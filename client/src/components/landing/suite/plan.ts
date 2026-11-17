/*
  The Oxford suite at Masonville Yards, measured off the building's published floor plan
  (masonvilleyards.com/floorplans, an 800 × 774 drawing). Every number below is a pixel position on
  that drawing, so the plan can be checked against the source by eye. 64 px is about one metre:
  the beds come out at 1.3 × 1.95 m and the door openings at 0.85 m.

  Plan axes: x runs east, y runs south. The window wall is north, the front door is south.
*/

export const PX_PER_M = 64;

/** Centre of the main block; the 3D model is built around it. */
export const ORIGIN = { x: 404, y: 296 } as const;

/** Plan pixels to metres. */
export const m = (px: number) => px / PX_PER_M;
/** Plan x to world x. */
export const wx = (x: number) => (x - ORIGIN.x) / PX_PER_M;
/** Plan y to world z. */
export const wz = (y: number) => (y - ORIGIN.y) / PX_PER_M;

/** [x0, y0, x1, y1] in plan pixels. */
export type Rect = readonly [number, number, number, number];

export const WALL_H = 1.16;
export const SILL_H = 0.3;
export const SLAB_H = 0.24;

/** The outline of the floor plate: the main block plus the foyer that runs south from it. */
export const FOOTPRINT: readonly (readonly [number, number])[] = [
  [72, 3],
  [736, 3],
  [736, 586],
  [432, 586],
  [432, 772],
  [310, 772],
  [310, 586],
  [72, 586],
];

export const INTERIOR: readonly Rect[] = [
  [87, 21, 721, 566],
  [326, 566, 411, 762],
];

/**
 * Outside walls belong to a side so the two sides facing the camera can drop out of the way.
 * Inside walls ('in') always stand.
 */
export type WallSide = 'n' | 'e' | 's' | 'w' | 'in';

export const WALLS: readonly { r: Rect; side: WallSide }[] = [
  // North: the piers between the three windows.
  { r: [72, 3, 120, 21], side: 'n' },
  { r: [255, 3, 337, 21], side: 'n' },
  { r: [473, 3, 554, 21], side: 'n' },
  { r: [688, 3, 736, 21], side: 'n' },
  // West and east, main block then foyer.
  { r: [72, 21, 87, 566], side: 'w' },
  { r: [310, 586, 326, 772], side: 'w' },
  { r: [721, 21, 736, 566], side: 'e' },
  { r: [411, 586, 432, 772], side: 'e' },
  // South, either side of the foyer, then the two stubs that hold the front door.
  { r: [72, 566, 326, 586], side: 's' },
  { r: [411, 566, 736, 586], side: 's' },
  { r: [326, 762, 345, 772], side: 's' },
  { r: [403, 762, 411, 772], side: 's' },

  // Bedroom 1.
  { r: [297, 21, 305, 210], side: 'in' },
  { r: [87, 198, 202, 213], side: 'in' },
  { r: [260, 200, 297, 210], side: 'in' },
  { r: [265, 210, 278, 216], side: 'in' },
  // Shared bath.
  { r: [195, 213, 202, 267], side: 'in' },
  { r: [195, 322, 202, 330], side: 'in' },
  { r: [87, 330, 202, 341], side: 'in' },
  { r: [87, 282, 119, 330], side: 'in' },
  // Bedroom 2 / kitchen.
  { r: [265, 275, 278, 566], side: 'in' },
  { r: [272, 503, 336, 512], side: 'in' },
  // Bedroom 3.
  { r: [484, 21, 492, 216], side: 'in' },
  { r: [492, 209, 500, 216], side: 'in' },
  { r: [555, 209, 608, 216], side: 'in' },
  // The two en-suites.
  { r: [601, 182, 608, 418], side: 'in' },
  { r: [608, 182, 618, 189], side: 'in' },
  { r: [669, 182, 721, 189], side: 'in' },
  { r: [608, 293, 721, 305], side: 'in' },
  { r: [608, 261, 657, 338], side: 'in' },
  { r: [608, 410, 618, 418], side: 'in' },
  { r: [669, 410, 721, 418], side: 'in' },
  // Bedroom 4 and the hall closet beside it.
  { r: [443, 372, 483, 380], side: 'in' },
  { r: [443, 380, 451, 390], side: 'in' },
  { r: [443, 441, 451, 468], side: 'in' },
  { r: [421, 467, 483, 475], side: 'in' },
  { r: [476, 475, 483, 566], side: 'in' },
  { r: [421, 525, 427, 566], side: 'in' },
  { r: [421, 528, 477, 535], side: 'in' },
];

/** Windows in the north wall: [x0, x1] and where the mullions fall. */
export const WINDOWS: readonly { x0: number; x1: number; mullions: readonly number[] }[] = [
  { x0: 120, x1: 255, mullions: [147, 228] },
  { x0: 337, x1: 473, mullions: [364, 445] },
  { x0: 554, x1: 688, mullions: [582, 662] },
];
export const WINDOW_Y = 12;

/** The glazed screen between the dining area and bedroom 4. */
export const SCREEN = { x0: 483, x1: 601, y: 376.5, posts: [522, 562] } as const;

export type RoomId =
  | 'living'
  | 'dining'
  | 'kitchen'
  | 'foyer'
  | 'bed1'
  | 'bed2'
  | 'bed3'
  | 'bed4'
  | 'bath1'
  | 'bath3'
  | 'bath4';

export type Tint = 'lavender' | 'mint' | 'peach' | 'butter' | 'sky';

export type Room = {
  id: RoomId;
  name: string;
  /** What the building says is in it. */
  note: string;
  tint: Tint;
  rects: readonly Rect[];
  /** Where its label sits, in plan pixels. */
  anchor: readonly [number, number];
};

export const ROOMS: readonly Room[] = [
  {
    id: 'living',
    name: 'Living room',
    note: 'Open plan, windows the width of the room',
    tint: 'butter',
    rects: [
      [305, 21, 484, 216],
      [278, 216, 440, 303],
    ],
    anchor: [392, 130],
  },
  {
    id: 'dining',
    name: 'Dining',
    note: 'A table for all four',
    tint: 'peach',
    rects: [[440, 216, 601, 372]],
    anchor: [529, 297],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    note: 'Stainless steel appliances, stone counters',
    tint: 'sky',
    rects: [[278, 303, 440, 467]],
    anchor: [372, 400],
  },
  {
    id: 'foyer',
    name: 'Foyer',
    note: 'Front door, coat closet, laundry',
    tint: 'lavender',
    rects: [
      [336, 467, 421, 586],
      [326, 586, 411, 762],
      [278, 512, 336, 566],
      [427, 475, 476, 528],
    ],
    anchor: [368, 660],
  },
  {
    id: 'bed1',
    name: 'Bedroom 1',
    note: 'Built-in bed, desk and closet. Shares a bath',
    tint: 'lavender',
    rects: [[87, 21, 297, 198]],
    anchor: [190, 110],
  },
  {
    id: 'bed2',
    name: 'Bedroom 2',
    note: 'Built-in bed, desk and closet. Shares a bath',
    tint: 'mint',
    rects: [[87, 341, 265, 566]],
    anchor: [176, 455],
  },
  {
    id: 'bed3',
    name: 'Bedroom 3',
    note: 'Built-in bed, desk and closet. Own bath',
    tint: 'peach',
    rects: [
      [492, 21, 721, 182],
      [492, 182, 601, 209],
    ],
    anchor: [605, 105],
  },
  {
    id: 'bed4',
    name: 'Bedroom 4',
    note: 'Built-in bed, desk and closet. Own bath',
    tint: 'sky',
    rects: [
      [451, 380, 601, 467],
      [601, 418, 721, 467],
      [483, 467, 721, 566],
    ],
    anchor: [600, 480],
  },
  {
    id: 'bath1',
    name: 'Shared bath',
    note: 'Glass shower, subway tile',
    tint: 'mint',
    rects: [
      [87, 213, 195, 330],
      [202, 213, 265, 337],
    ],
    anchor: [150, 270],
  },
  {
    id: 'bath3',
    name: 'En-suite',
    note: 'Glass shower, subway tile',
    tint: 'sky',
    rects: [[608, 189, 721, 293]],
    anchor: [664, 240],
  },
  {
    id: 'bath4',
    name: 'En-suite',
    note: 'Glass shower, subway tile',
    tint: 'lavender',
    rects: [[608, 305, 721, 410]],
    anchor: [664, 357],
  },
];

export const BEDROOMS: readonly RoomId[] = ['bed1', 'bed2', 'bed3', 'bed4'];

/** Floors that are tiled, not oak. */
export const TILED: readonly Rect[] = [
  [87, 213, 195, 330],
  [608, 189, 721, 293],
  [608, 305, 721, 410],
];

export type DoorId =
  | 'entry'
  | 'hall'
  | 'bath1'
  | 'bed3'
  | 'bath3'
  | 'bath4'
  | 'bed4'
  | 'coats'
  | 'laundry';

/**
 * Hinged doors. Angles are plan degrees: 0 points east, 90 south, 180 west, 270 north.
 * `rest` is how far open the door stands when nothing is happening (0 shut, 1 fully open).
 */
export const DOORS: readonly {
  id: DoorId;
  hinge: readonly [number, number];
  length: number;
  closed: number;
  open: number;
  rest: number;
  /** Rooms whose hover or focus swings this door fully open. */
  rooms: readonly RoomId[];
}[] = [
  { id: 'entry', hinge: [403, 767], length: 57, closed: 180, open: 268, rest: 0.12, rooms: ['foyer'] },
  { id: 'hall', hinge: [271, 275], length: 58, closed: 270, open: 100, rest: 0.78, rooms: ['bath1', 'bed1', 'bed2'] },
  { id: 'bath1', hinge: [198.5, 322], length: 54, closed: 270, open: 182, rest: 0.7, rooms: ['bath1'] },
  { id: 'bed3', hinge: [500, 212.5], length: 55, closed: 0, open: -88, rest: 0.72, rooms: ['bed3', 'bath3'] },
  { id: 'bath3', hinge: [618, 185.5], length: 51, closed: 0, open: 88, rest: 0.6, rooms: ['bath3'] },
  { id: 'bath4', hinge: [618, 414], length: 51, closed: 0, open: -88, rest: 0.6, rooms: ['bath4'] },
  { id: 'bed4', hinge: [447, 390], length: 51, closed: 90, open: 2, rest: 0.72, rooms: ['bed4', 'bath4'] },
  { id: 'coats', hinge: [424, 477], length: 48, closed: 90, open: 172, rest: 0.4, rooms: ['foyer'] },
  { id: 'laundry', hinge: [332, 565], length: 52, closed: 270, open: 352, rest: 0.42, rooms: ['foyer'] },
];

/** The two pocket doors that close bedrooms 1 and 2 off from their shared hall. */
export const POCKET_DOORS: readonly { room: RoomId; y: number; x0: number; x1: number }[] = [
  { room: 'bed1', y: 205.5, x0: 202, x1: 260 },
  { room: 'bed2', y: 335.5, x0: 202, x1: 265 },
];

/** Bounding box of a room in plan pixels. */
export function roomBounds(room: Room) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [a, b, c, d] of room.rects) {
    x0 = Math.min(x0, a);
    y0 = Math.min(y0, b);
    x1 = Math.max(x1, c);
    y1 = Math.max(y1, d);
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

/** Which room a point on the floor (plan pixels) falls in. */
export function roomAt(x: number, y: number): RoomId | null {
  for (const room of ROOMS) {
    for (const [a, b, c, d] of room.rects) {
      if (x >= a && x <= c && y >= b && y <= d) return room.id;
    }
  }
  return null;
}

export const roomById = (id: RoomId) => ROOMS.find((room) => room.id === id)!;
