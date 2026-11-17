import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { m as metres, wx, wz, type Rect } from './plan';

/*
  Small building blocks for the suite: cached primitives that sit on the floor (their origin is the
  centre of their base, so `y` is always "how high off the floor"), the brand colours converted from
  the oklch tokens in styles.css, and the textures, which are drawn on a canvas so nothing is
  downloaded.
*/

export type Mat = THREE.Material;

const geometries = new Map<string, THREE.BufferGeometry>();

function cached(key: string, make: () => THREE.BufferGeometry) {
  let geometry = geometries.get(key);
  if (!geometry) {
    geometry = make();
    // Marked so the scene knows these are shared and must outlive any one mesh.
    geometry.userData.cached = true;
    geometries.set(key, geometry);
  }
  return geometry;
}

/** Frees every cached primitive. Called when the scene is torn down. */
export function disposeKit() {
  geometries.forEach((geometry) => geometry.dispose());
  geometries.clear();
}

function mesh(geometry: THREE.BufferGeometry, mat: Mat | Mat[], x: number, y: number, z: number) {
  const out = new THREE.Mesh(geometry, mat);
  out.position.set(x, y, z);
  out.castShadow = true;
  out.receiveShadow = true;
  return out;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function box(w: number, h: number, d: number, mat: Mat | Mat[], x = 0, y = 0, z = 0) {
  const key = `b:${r3(w)}:${r3(h)}:${r3(d)}`;
  return mesh(
    cached(key, () => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0)),
    mat,
    x,
    y,
    z,
  );
}

/** A box with softened edges: cushions, mattresses, anything upholstered or moulded. */
export function rbox(w: number, h: number, d: number, radius: number, mat: Mat, x = 0, y = 0, z = 0) {
  const key = `r:${r3(w)}:${r3(h)}:${r3(d)}:${r3(radius)}`;
  return mesh(
    cached(key, () => new RoundedBoxGeometry(w, h, d, 3, radius).translate(0, h / 2, 0)),
    mat,
    x,
    y,
    z,
  );
}

export function cyl(rTop: number, rBottom: number, h: number, mat: Mat, x = 0, y = 0, z = 0, sides = 24) {
  const key = `c:${r3(rTop)}:${r3(rBottom)}:${r3(h)}:${sides}`;
  return mesh(
    cached(key, () => new THREE.CylinderGeometry(rTop, rBottom, h, sides).translate(0, h / 2, 0)),
    mat,
    x,
    y,
    z,
  );
}

export function ball(radius: number, mat: Mat, x = 0, y = 0, z = 0) {
  return mesh(
    cached(`s:${r3(radius)}`, () => new THREE.SphereGeometry(radius, 20, 14)),
    mat,
    x,
    y,
    z,
  );
}

export function torus(radius: number, tube: number, mat: Mat, arc = Math.PI * 2) {
  return mesh(
    cached(`t:${r3(radius)}:${r3(tube)}:${r3(arc)}`, () => new THREE.TorusGeometry(radius, tube, 8, 28, arc)),
    mat,
    0,
    0,
    0,
  );
}

/** Flat quads lying on the floor, one per plan rectangle, merged into a single geometry. */
export function rectsGeometry(rects: readonly Rect[], uvMetres = 1, grainAlongZ = false) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  rects.forEach(([x0, y0, x1, y1], i) => {
    const ax = wx(x0);
    const bx = wx(x1);
    const az = wz(y0);
    const bz = wz(y1);
    positions.push(ax, 0, az, bx, 0, az, bx, 0, bz, ax, 0, bz);
    for (const [x, z] of [
      [ax, az],
      [bx, az],
      [bx, bz],
      [ax, bz],
    ]) {
      if (grainAlongZ) uvs.push(z / uvMetres, x / uvMetres);
      else uvs.push(x / uvMetres, z / uvMetres);
    }
    const o = i * 4;
    indices.push(o, o + 2, o + 1, o, o + 3, o + 2);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A wall-sized rectangle as a box in world space, base on the floor. */
export function rectBox(rect: Rect, height: number, mat: Mat | Mat[], y = 0) {
  const [x0, y0, x1, y1] = rect;
  return box(metres(x1 - x0), height, metres(y1 - y0), mat, wx((x0 + x1) / 2), y, wz((y0 + y1) / 2));
}

/** Turns an object so its front (+Z as built) faces a plan direction: 0 east, 90 south, 180 west, 270 north. */
export function face<T extends THREE.Object3D>(object: T, planDegrees: number) {
  object.rotation.y = THREE.MathUtils.degToRad(90 - planDegrees);
  return object;
}

/** Puts an object on the floor at a plan position. */
export function at<T extends THREE.Object3D>(object: T, x: number, y: number, planDegrees = 90) {
  object.position.set(wx(x), object.position.y, wz(y));
  return face(object, planDegrees);
}

/** Repeatable pseudo-random numbers, so the model looks the same on every load. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Colour ---------- */

/** An oklch() colour, as written in styles.css, converted for three.js. */
export function oklch(l: number, c: number, h: number) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return new THREE.Color().setRGB(
    clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
    THREE.LinearSRGBColorSpace,
  );
}

/** The five pastels and Western purple, the same values as the CSS tokens. */
export const BRAND = {
  purple: oklch(0.378, 0.148, 299.4),
  purpleDeep: oklch(0.3, 0.125, 299.4),
  ink: oklch(0.22, 0.035, 300),
  lavender: oklch(0.84, 0.075, 302),
  mint: oklch(0.91, 0.075, 155),
  peach: oklch(0.89, 0.065, 50),
  butter: oklch(0.94, 0.08, 95),
  sky: oklch(0.89, 0.055, 235),
  // A step deeper than each pastel, for the throw at the foot of a bed or a cushion on a sofa.
  lavenderDeep: oklch(0.66, 0.11, 302),
  mintDeep: oklch(0.72, 0.1, 158),
  peachDeep: oklch(0.72, 0.12, 45),
  butterDeep: oklch(0.82, 0.13, 90),
  skyDeep: oklch(0.7, 0.09, 238),
} as const;

/* ---------- Textures ---------- */

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** Light oak planks. One tile of the texture covers OAK_TILE metres. */
export const OAK_TILE = 3.2;
function oakTexture() {
  const random = seeded(7);
  return canvasTexture(1024, (ctx, size) => {
    const rows = 20;
    const rowH = size / rows;
    for (let row = 0; row < rows; row++) {
      let x = -random() * 300;
      while (x < size) {
        const length = 260 + random() * 300;
        const light = 71 + random() * 7;
        const warm = 32 + random() * 6;
        ctx.fillStyle = `hsl(${warm} ${42 + random() * 8}% ${light}%)`;
        ctx.fillRect(x, row * rowH, length, rowH);
        // A few faint streaks of grain along each plank.
        for (let g = 0; g < 5; g++) {
          ctx.fillStyle = `hsl(${warm} 35% ${light - 5}% / ${0.12 + random() * 0.14})`;
          ctx.fillRect(x + random() * length * 0.5, row * rowH + random() * rowH, length * (0.3 + random() * 0.5), 1);
        }
        ctx.fillStyle = 'hsl(30 30% 42% / 0.5)';
        ctx.fillRect(x + length - 1, row * rowH, 1.5, rowH);
        x += length;
      }
      ctx.fillStyle = 'hsl(30 30% 46% / 0.42)';
      ctx.fillRect(0, row * rowH, size, 1.5);
    }
  });
}

/** Square porcelain floor tile. One tile of the texture covers TILE_TILE metres. */
export const TILE_TILE = 1.2;
function tileTexture() {
  const random = seeded(11);
  return canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(0, 0, size, size);
    const n = 4;
    const step = size / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = `hsl(40 ${10 + random() * 6}% ${84 + random() * 4}%)`;
        ctx.fillRect(i * step + 2, j * step + 2, step - 4, step - 4);
      }
    }
  });
}

/** White subway tile in a running bond. One tile of the texture covers SUBWAY_TILE metres. */
export const SUBWAY_TILE = 0.6;
function subwayTexture() {
  return canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#d6d1c7';
    ctx.fillRect(0, 0, size, size);
    const w = size / 4;
    const h = size / 8;
    for (let row = 0; row < 8; row++) {
      const offset = row % 2 ? w / 2 : 0;
      for (let col = -1; col < 5; col++) {
        ctx.fillStyle = '#fbfaf6';
        ctx.fillRect(col * w + offset + 2, row * h + 2, w - 4, h - 4);
      }
    }
  });
}

/** An ivory rug with a loose diamond lattice. */
function rugTexture() {
  return canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#f1ebdf';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(58, 46, 78, 0.5)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const step = size / 4;
    for (let i = -4; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step + size, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step - size, size);
      ctx.stroke();
    }
  });
}

/** The soft shadow the whole model throws on the page, drawn once and laid under the slab. */
export function groundShadowTexture(footprint: readonly (readonly [number, number])[], bounds: Rect, margin: number) {
  const [x0, y0, x1, y1] = bounds;
  const size = 512;
  const span = Math.max(x1 - x0, y1 - y0) + margin * 2;
  const scale = size / span;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const ox = (span - (x1 - x0)) / 2 - x0;
  const oy = (span - (y1 - y0)) / 2 - y0;
  // The shape itself is drawn off the canvas; only its blurred shadow lands on it. (Canvas
  // `filter: blur()` would be simpler but Safari has been slow to support it.)
  const away = size * 2;
  ctx.shadowColor = 'rgba(38, 26, 52, 0.6)';
  ctx.shadowBlur = margin * scale * 0.7;
  ctx.shadowOffsetX = away;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  footprint.forEach(([x, y], i) => {
    const px = (x + ox) * scale - away;
    const py = (y + oy) * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, span: metres(span) };
}

/* ---------- Materials ---------- */

const std = (color: THREE.ColorRepresentation, roughness = 0.9, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

export function createMaterials() {
  const textures = {
    oak: oakTexture(),
    tile: tileTexture(),
    subway: subwayTexture(),
    rug: rugTexture(),
  };

  const mats = {
    // Shell
    wall: std('#f7f3ea', 0.96),
    wallCap: std(BRAND.ink, 0.85),
    slab: std('#f3eee4', 0.96),
    floorOak: std('#ffffff', 0.72, 0, { map: textures.oak }),
    floorTile: std('#ffffff', 0.45, 0, { map: textures.tile }),
    subway: std('#ffffff', 0.3, 0, { map: textures.subway }),
    glass: new THREE.MeshStandardMaterial({
      color: '#cfe4e6',
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    curtain: new THREE.MeshStandardMaterial({
      color: '#fbf7ee',
      roughness: 1,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
    door: std('#fbf8f1', 0.7),
    doorEntry: std(BRAND.purple, 0.55),

    // Wood, lacquer, stone, metal
    oak: std('#d6b384', 0.7),
    walnut: std('#8d684a', 0.65),
    white: std('#faf7f1', 0.6),
    inkMatte: std(BRAND.ink.clone().lerp(BRAND.purple, 0.25), 0.8),
    stone: std('#eee9df', 0.32),
    ceramic: std('#fdfcf9', 0.22),
    steel: std('#c9ccd0', 0.36, 0.9),
    steelDark: std('#8b8f96', 0.4, 0.85),
    chrome: std('#e6e8ea', 0.16, 1),
    brass: std('#c9a35b', 0.34, 0.9),
    black: std('#27232e', 0.55, 0.3),
    blackGlass: std('#17141c', 0.14, 0.35),
    gap: std('#3a3342', 0.9),
    mirror: std('#eef2f2', 0.04, 1),

    // Textiles
    linen: std('#fbf8f2', 1),
    pillow: std('#ffffff', 1),
    sofa: std('#d9d1c3', 1),
    rug: std('#ffffff', 1, 0, { map: textures.rug }),
    jute: std('#c8ad84', 1),
    lavender: std(BRAND.lavender, 1),
    mint: std(BRAND.mint, 1),
    peach: std(BRAND.peach, 1),
    butter: std(BRAND.butter, 1),
    sky: std(BRAND.sky, 1),
    lavenderDeep: std(BRAND.lavenderDeep, 1),
    mintDeep: std(BRAND.mintDeep, 1),
    peachDeep: std(BRAND.peachDeep, 1),
    butterDeep: std(BRAND.butterDeep, 1),
    skyDeep: std(BRAND.skyDeep, 1),
    purple: std(BRAND.purple, 0.9),

    // Plants and small things
    leaf: std('#5d8c63', 0.75),
    leafDark: std('#47744f', 0.75),
    soil: std('#4b3d35', 1),
    terracotta: std('#cf8f6c', 0.85),
    paper: std('#f4eee2', 0.9),
    kraft: std('#c9a878', 0.9),
    glow: new THREE.MeshStandardMaterial({
      color: '#fff4dc',
      emissive: '#ffd9a0',
      emissiveIntensity: 0.85,
      roughness: 0.6,
    }),
    screen: new THREE.MeshStandardMaterial({
      color: '#dfe6f5',
      emissive: '#c7d4f2',
      emissiveIntensity: 0.55,
      roughness: 0.3,
    }),
  };

  const dispose = () => {
    Object.values(textures).forEach((texture) => texture.dispose());
    Object.values(mats).forEach((material) => material.dispose());
  };

  return { mats, textures, dispose };
}

export type Mats = ReturnType<typeof createMaterials>['mats'];
export type TintKey = 'lavender' | 'mint' | 'peach' | 'butter' | 'sky';

/** A wall-mounted rectangle covered in a repeating texture at its true scale. */
export function tiledPanel(w: number, h: number, mat: Mat, tileMetres: number) {
  const geometry = new THREE.PlaneGeometry(w, h);
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) * w) / tileMetres, (uv.getY(i) * h) / tileMetres);
  }
  geometry.translate(0, h / 2, 0);
  const out = new THREE.Mesh(geometry, mat);
  out.receiveShadow = true;
  return out;
}
