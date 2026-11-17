import * as THREE from 'three';
import {
  DOORS,
  FOOTPRINT,
  INTERIOR,
  POCKET_DOORS,
  ROOMS,
  SCREEN,
  SILL_H,
  SLAB_H,
  TILED,
  WALLS,
  WALL_H,
  WINDOWS,
  WINDOW_Y,
  m as metres,
  wx,
  wz,
  type DoorId,
  type RoomId,
  type WallSide,
} from './plan';
import {
  BRAND,
  OAK_TILE,
  SUBWAY_TILE,
  TILE_TILE,
  at,
  box,
  cyl,
  ball,
  groundShadowTexture,
  rectBox,
  rectsGeometry,
  tiledPanel,
  type Mat,
  type Mats,
} from './kit';
import { createFurniture } from './furniture';

type OuterSide = Exclude<WallSide, 'in'>;

export type SuiteDoor = {
  pivot: THREE.Group;
  closed: number;
  open: number;
  rest: number;
  rooms: readonly RoomId[];
  /** 0 shut, 1 fully open. */
  t: number;
};

export type SuitePocketDoor = { panel: THREE.Object3D; room: RoomId; shutX: number; travel: number; t: number };

/** Something that arrives during the intro: where it is on the plan decides when. */
export type SuitePiece = { object: THREE.Object3D; x: number; z: number };

export type Suite = {
  root: THREE.Group;
  slab: THREE.Object3D;
  floor: THREE.Object3D;
  /** The four outside wall runs, each of which can drop when it faces the camera. */
  sides: Record<OuterSide, THREE.Group>;
  walls: SuitePiece[];
  fittings: SuitePiece[];
  furniture: SuitePiece[];
  doors: Map<DoorId, SuiteDoor>;
  pocketDoors: SuitePocketDoor[];
  highlights: Map<RoomId, THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>;
  setDoor: (door: SuiteDoor, t: number) => void;
  setPocketDoor: (door: SuitePocketDoor, t: number) => void;
};

const TINTS = {
  lavender: BRAND.lavender,
  mint: BRAND.mint,
  peach: BRAND.peach,
  butter: BRAND.butterDeep,
  sky: BRAND.sky,
} as const;

/** A gathered sheer curtain: a plane with a ripple pushed into it. */
function curtain(width: number, height: number, mat: Mat) {
  const geometry = new THREE.PlaneGeometry(width, height, 18, 1);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) / width + 0.5;
    position.setZ(i, Math.sin(u * Math.PI * 7) * 0.035);
  }
  geometry.computeVertexNormals();
  geometry.translate(0, height / 2, 0);
  const out = new THREE.Mesh(geometry, mat);
  out.castShadow = true;
  out.receiveShadow = true;
  return out;
}

export function buildSuite(m: Mats): Suite {
  const f = createFurniture(m);
  const root = new THREE.Group();

  /* ---------- Slab, floors, the shadow under it all ---------- */

  const outline = new THREE.Shape();
  FOOTPRINT.forEach(([x, y], i) => {
    if (i === 0) outline.moveTo(wx(x), wz(y));
    else outline.lineTo(wx(x), wz(y));
  });
  outline.closePath();
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: SLAB_H, bevelEnabled: false }), m.slab);
  // Drawn in X/Y, laid flat so Y becomes Z and the thickness hangs below the floor.
  slab.rotation.x = Math.PI / 2;
  slab.castShadow = true;
  slab.receiveShadow = true;
  root.add(slab);

  const floor = new THREE.Group();
  const oak = new THREE.Mesh(rectsGeometry(INTERIOR, OAK_TILE, true), m.floorOak);
  oak.position.y = 0.003;
  oak.receiveShadow = true;
  const tile = new THREE.Mesh(rectsGeometry(TILED, TILE_TILE), m.floorTile);
  tile.position.y = 0.007;
  tile.receiveShadow = true;
  floor.add(oak, tile);
  root.add(floor);

  const shadow = groundShadowTexture(FOOTPRINT, [72, 3, 736, 772], 190);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(shadow.span, shadow.span),
    new THREE.MeshBasicMaterial({ map: shadow.texture, transparent: true, depthWrite: false, opacity: 0.5, toneMapped: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(wx((72 + 736) / 2), -SLAB_H - 0.012, wz((3 + 772) / 2));
  ground.renderOrder = -1;
  root.add(ground);

  /* ---------- Walls ---------- */

  const wallMats = [m.wall, m.wall, m.wallCap, m.wall, m.wall, m.wall];
  const sillMats = [m.wall, m.wall, m.stone, m.wall, m.wall, m.wall];
  const sides: Suite['sides'] = { n: new THREE.Group(), e: new THREE.Group(), s: new THREE.Group(), w: new THREE.Group() };
  const inside = new THREE.Group();
  root.add(sides.n, sides.e, sides.s, sides.w, inside);

  const walls: SuitePiece[] = [];
  const fittings: SuitePiece[] = [];
  const piece = (object: THREE.Object3D, x: number, y: number): SuitePiece => ({ object, x: wx(x), z: wz(y) });

  for (const { r, side } of WALLS) {
    const wall = rectBox(r, WALL_H, wallMats);
    (side === 'in' ? inside : sides[side]).add(wall);
    walls.push(piece(wall, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2));
  }

  // Windows: a low sill, black frames, glass up to where the walls are cut, sheers at each end.
  for (const win of WINDOWS) {
    const width = metres(win.x1 - win.x0);
    const cx = (win.x0 + win.x1) / 2;
    const unit = new THREE.Group();
    unit.position.set(wx(cx), 0, wz(WINDOW_Y));
    unit.add(box(width, SILL_H, metres(18), sillMats));
    const glassH = WALL_H - SILL_H;
    const glass = box(width, glassH, 0.014, m.glass, 0, SILL_H, 0);
    glass.castShadow = false;
    unit.add(glass);
    unit.add(box(width, 0.035, 0.06, m.black, 0, SILL_H, 0));
    unit.add(box(width, 0.035, 0.06, m.black, 0, WALL_H - 0.035, 0));
    for (const x of [win.x0 + 1.5, ...win.mullions, win.x1 - 1.5]) {
      unit.add(box(0.035, glassH, 0.06, m.black, metres(x - cx), SILL_H, 0));
    }
    for (const end of [-1, 1]) {
      const sheer = curtain(0.34, WALL_H - 0.06, m.curtain);
      sheer.position.set(end * (width / 2 - 0.19), 0.04, metres(9) + 0.07);
      unit.add(sheer);
    }
    sides.n.add(unit);
    walls.push(piece(unit, cx, WINDOW_Y));
  }

  // The glazed screen that borrows light from the dining area for bedroom 4.
  {
    const width = metres(SCREEN.x1 - SCREEN.x0);
    const cx = (SCREEN.x0 + SCREEN.x1) / 2;
    const unit = new THREE.Group();
    unit.position.set(wx(cx), 0, wz(SCREEN.y));
    const glass = box(width, WALL_H - 0.04, 0.014, m.glass, 0, 0.04, 0);
    glass.castShadow = false;
    unit.add(glass);
    unit.add(box(width, 0.04, 0.05, m.black));
    unit.add(box(width, 0.035, 0.05, m.black, 0, WALL_H - 0.035, 0));
    for (const x of [SCREEN.x0 + 1.5, ...SCREEN.posts, SCREEN.x1 - 1.5]) {
      unit.add(box(0.035, WALL_H, 0.05, m.black, metres(x - cx), 0, 0));
    }
    inside.add(unit);
    walls.push(piece(unit, cx, SCREEN.y));
  }

  /* ---------- Doors ---------- */

  const doors = new Map<DoorId, SuiteDoor>();
  const setDoor = (door: SuiteDoor, t: number) => {
    door.t = t;
    door.pivot.rotation.y = -THREE.MathUtils.degToRad(door.closed + (door.open - door.closed) * t);
  };

  for (const spec of DOORS) {
    const length = metres(spec.length);
    const entry = spec.id === 'entry';
    const pivot = new THREE.Group();
    pivot.position.set(wx(spec.hinge[0]), 0, wz(spec.hinge[1]));
    const leafH = WALL_H - 0.03;
    pivot.add(box(length, leafH, entry ? 0.05 : 0.038, entry ? m.doorEntry : m.door, length / 2, 0.012, 0));
    if (entry) {
      // Brass on purple: a knob, a letter slot and a knocker on each face.
      for (const side of [-1, 1]) {
        pivot.add(ball(0.032, m.brass, length - 0.09, 0.62, side * 0.05));
        pivot.add(box(0.26, 0.04, 0.008, m.brass, length / 2, 0.42, side * 0.026));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 8, 20), m.brass);
        ring.position.set(length / 2, 0.86, side * 0.034);
        ring.castShadow = true;
        pivot.add(ring);
        pivot.add(cyl(0.014, 0.014, 0.012, m.brass, length / 2, 0.905, side * 0.03, 10).rotateX(Math.PI / 2));
      }
    } else {
      for (const side of [-1, 1]) {
        pivot.add(box(0.1, 0.016, 0.016, m.black, length - 0.1, 0.64, side * 0.034));
        pivot.add(cyl(0.012, 0.012, 0.03, m.black, length - 0.06, 0.64, side * 0.02, 8).rotateX(Math.PI / 2));
      }
    }
    const door: SuiteDoor = { pivot, closed: spec.closed, open: spec.open, rest: spec.rest, rooms: spec.rooms, t: 0 };
    setDoor(door, 0);
    doors.set(spec.id, door);
    root.add(pivot);
    fittings.push(piece(pivot, spec.hinge[0], spec.hinge[1]));
  }

  const pocketDoors: SuitePocketDoor[] = [];
  const setPocketDoor = (door: SuitePocketDoor, t: number) => {
    door.t = t;
    door.panel.position.x = door.shutX - door.travel * t;
  };
  for (const spec of POCKET_DOORS) {
    const length = metres(spec.x1 - spec.x0);
    const panel = box(length, WALL_H - 0.03, 0.036, m.door, 0, 0.012, wz(spec.y));
    panel.add(box(0.016, 0.2, 0.05, m.black, length / 2 - 0.05, 0.55, 0));
    const door: SuitePocketDoor = { panel, room: spec.room, shutX: wx((spec.x0 + spec.x1) / 2), travel: length * 0.92, t: 0 };
    setPocketDoor(door, 0);
    pocketDoors.push(door);
    root.add(panel);
    fittings.push(piece(panel, spec.x0, spec.y));
  }

  /* ---------- Room highlights ---------- */

  const highlights: Suite['highlights'] = new Map();
  for (const room of ROOMS) {
    const mat = new THREE.MeshBasicMaterial({
      color: TINTS[room.tint],
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const tint = new THREE.Mesh(rectsGeometry(room.rects), mat);
    tint.position.y = 0.011;
    tint.renderOrder = 1;
    tint.visible = false;
    highlights.set(room.id, tint);
    root.add(tint);
  }

  /* ---------- Furniture ---------- */

  const furniture: SuitePiece[] = [];
  /** Stand something on the floor at a plan position, front turned to a plan bearing. */
  const put = (object: THREE.Object3D, x: number, y: number, bearing = 90, lift = 0) => {
    at(object, x, y, bearing);
    object.position.y = lift;
    root.add(object);
    furniture.push(piece(object, x, y));
    return object;
  };

  const clothes = [m.lavender, m.white, m.inkMatte, m.peach, m.sky, m.mint, m.jute, m.butter, m.purple];

  // Bedroom 1 (north-west), lavender.
  put(f.roundRug(0.52, m.jute), 206, 112);
  put(f.bed(1.31, 1.97, m.lavender, m.lavenderDeep), 131, 134, 270);
  put(f.nightstand(0.34, 0.42, 'lamp'), 187, 181, 270);
  put(f.desk(1.03, 0.58, 'laptop'), 278.5, 78, 180);
  put(f.chair(m.white), 246, 80, 12);
  const drawers1 = f.drawers(0.45, 0.58, 0.72, 3);
  const fern1 = f.herb(m.terracotta, 1.5);
  fern1.position.set(0, 0.72, 0);
  drawers1.add(fern1);
  put(drawers1, 278.5, 125.5, 180);
  put(f.closet(0.89, 0.58, clothes), 277.5, 168.5, 180);
  put(f.snakePlant(m.white), 103, 40);
  put(f.laundryBasket(), 226, 40);

  // Bedroom 2 (south-west), mint.
  put(f.roundRug(0.5, m.jute), 214, 452);
  put(f.bed(1.31, 1.97, m.mint, m.mintDeep), 131, 405.5, 90);
  put(f.nightstand(0.34, 0.44, 'plant'), 187, 358, 90);
  put(f.bookcase(0.92, 0.22), 257, 370.5, 180);
  put(f.desk(1.02, 0.58, 'monitor'), 143.5, 546.5, 270);
  put(f.chair(m.inkMatte, m.black), 141, 512, 98);
  put(f.drawers(0.47, 0.58, 0.72, 3), 191, 546.5, 270);
  put(f.closet(0.9, 0.6, clothes), 235, 546, 270);
  put(f.floatingShelf(0.8), 258.5, 446, 180);
  put(f.pennant(), 264.4, 498, 180);
  put(f.skateboard(), 226, 492, 60);

  // Bedroom 3 (north-east), peach.
  put(f.roundRug(0.55, m.jute), 592, 152);
  put(f.bed(1.31, 2.0, m.peach, m.peachDeep), 557, 65, 0);
  put(f.nightstand(0.34, 0.46, 'books'), 508, 124, 0);
  put(f.desk(1.02, 0.58, 'study'), 702.5, 89.5, 180);
  put(f.chair(m.oak), 671, 92, -8);
  const drawers3 = f.drawers(0.47, 0.58, 0.72, 3);
  const lamp3 = f.books(3);
  lamp3.position.set(0, 0.72, 0);
  drawers3.add(lamp3);
  put(drawers3, 702.5, 42, 180);
  put(f.closet(0.89, 0.58, clothes), 701.5, 151.5, 180);
  put(f.fig(1.05, m.terracotta), 645, 38);
  put(f.backpack(m.purple), 584, 196, 260);

  // Bedroom 4 (south-east), sky.
  put(f.roundRug(0.44, m.jute), 564, 492);
  put(f.bed(1.31, 1.95, m.sky, m.skyDeep), 655.5, 521, 180);
  put(f.nightstand(0.34, 0.46, 'lamp'), 705, 463, 180);
  put(f.desk(1.03, 0.56, 'laptop'), 567, 399, 90);
  put(f.chair(m.sky), 566, 433, 262);
  put(f.closet(0.9, 0.6, clothes), 503, 532, 0);
  put(f.drawers(0.47, 0.56, 0.8, 4), 502, 488, 0);
  const console4 = f.drawers(0.98, 0.3, 0.5, 2, m.oak);
  const stack4 = f.books(4);
  stack4.position.set(-0.28, 0.5, 0);
  const plant4 = f.herb(m.white, 1.4);
  plant4.position.set(0.3, 0.5, 0);
  console4.add(stack4, plant4);
  put(console4, 557.5, 554, 270);
  put(f.snakePlant(m.terracotta), 466, 456);

  // Living room.
  put(f.rug(2.14, 2.06, m.rug), 388, 114);
  put(f.sofa(1.78, 0.83, m.sofa, [m.lavender, m.peach, m.butter]), 331.5, 90, 0);
  put(f.coffeeTable(0.52, 1.1), 400.5, 113.5);
  put(f.tvConsole(1.23, 0.3), 473, 110, 180);
  put(f.armchair(m.butter, m.lavenderDeep), 362, 192, 315);
  put(f.sideTable(), 319, 170);
  put(f.floorLamp(), 412, 196);
  put(f.fig(1.3, m.white), 461, 42);
  put(f.frame(0.52, 0.4, m.lavender, 0.7), 305.4, 64, 0);
  put(f.frame(0.36, 0.4, m.peach, 0.7), 305.4, 112, 0);
  put(f.stool(), 313, 286);
  put(f.stool(), 351, 286);

  // Dining: four chairs, one in each bedroom's colour.
  put(f.diningTable(0.5), 529, 297);
  const seats: [number, Mat][] = [
    [45, m.sky],
    [135, m.mint],
    [225, m.lavender],
    [315, m.peach],
  ];
  for (const [bearing, shell] of seats) {
    const rad = (bearing * Math.PI) / 180;
    put(f.chair(shell), 529 + Math.cos(rad) * 46, 297 + Math.sin(rad) * 46, bearing + 180);
  }
  put(f.snakePlant(m.white), 590, 229);

  // Kitchen: a peninsula with the sink, the fridge at its end, then the range run down the wall.
  put(f.rug(0.62, 1.5, m.jute), 372, 404);
  const peninsula = f.counter(1.375, 0.67, { overhang: 0.2 });
  const tap = f.sink();
  tap.position.set(0.31, 0.9, 0);
  const pot = f.herb(m.white, 1.2);
  pot.position.set(-0.5, 0.9, -0.26);
  const slices = f.toaster();
  slices.position.set(-0.42, 0.9, 0.06);
  slices.rotation.y = 0.3;
  peninsula.add(tap, pot, slices);
  put(peninsula, 322, 324.5, 90);
  put(f.fridge(0.67, 0.66), 387.5, 325, 90);
  const prep = f.counter(0.36, 0.625);
  const board = f.choppingBoard();
  board.position.set(0, 0.9, 0.02);
  board.rotation.y = Math.PI / 2;
  prep.add(board);
  put(prep, 298, 357.5, 0);
  put(f.range(0.76, 0.63), 298, 393.5, 0);
  const landing = f.counter(0.47, 0.625);
  const boil = f.kettle();
  boil.position.set(0.02, 0.9, -0.08);
  boil.rotation.y = 0.8;
  const oils = f.bottles();
  oils.position.set(-0.12, 0.9, -0.2);
  landing.add(boil, oils);
  put(landing, 298, 433, 0);
  put(f.pantry(0.86, 0.625), 298, 475.5, 0);
  const splash = tiledPanel(metres(102), WALL_H - 0.9, m.subway, SUBWAY_TILE);
  put(splash, 278.3, 397, 0, 0.9);
  put(f.laundry(), 301, 540, 0);

  // Foyer.
  put(f.rug(0.72, 1.75, m.lavenderDeep), 368.5, 656);
  put(f.rug(0.76, 0.42, m.jute), 372, 740);
  put(f.bench(0.92, m.butter), 337, 652, 0);
  put(f.coatStand(), 396, 608);
  put(f.umbrellaStand(), 335, 750);
  const coats = f.hangingRail(0.72, [m.inkMatte, m.jute, m.purple, m.sky, m.white]);
  put(coats, 452, 501, 0);
  put(f.waterHeater(), 451.5, 551);

  // Shared bath.
  put(f.rug(0.72, 0.46, m.mint), 166, 292);
  put(f.shower(metres(59), m.mintDeep), 117.5, 245.5);
  put(f.toilet(), 173, 236, 90);
  put(f.vanity(0.69, 0.36, m.mint), 130.5, 306, 0);

  // En-suite to bedroom 3.
  put(f.rug(0.6, 0.4, m.peach), 646, 222);
  put(f.shower(metres(61), m.peachDeep), 690.5, 262.5, 270);
  put(f.toilet(), 698, 210, 180);
  put(f.vanity(0.72, 0.33, m.peach), 634, 250.5, 270);

  // En-suite to bedroom 4.
  put(f.rug(0.6, 0.4, m.sky), 646, 386);
  put(f.shower(metres(61), m.skyDeep), 690.5, 336, 180);
  put(f.toilet(), 698, 389, 180);
  put(f.vanity(0.72, 0.33, m.sky), 634, 348.5, 90);

  return { root, slab, floor, sides, walls, fittings, furniture, doors, pocketDoors, highlights, setDoor, setPocketDoor };
}
